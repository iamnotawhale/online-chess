package com.chessonline.service;

import com.chessonline.model.Puzzle;
import com.chessonline.model.UserPuzzleSolution;
import com.chessonline.model.User;
import com.chessonline.model.UserStats;
import com.chessonline.dto.PuzzleResponse;
import com.chessonline.repository.UserPuzzleSolutionRepository;
import com.chessonline.repository.PuzzleRepository;
import com.chessonline.repository.UserRepository;
import com.chessonline.repository.UserStatsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.UUID;

@Service
public class PuzzleService {
    
    private static final Logger log = LoggerFactory.getLogger(PuzzleService.class);
    private static final int RATING_BUCKET_SIZE = 100; // Group puzzles by 100 rating points
    private static final int PUZZLE_RATING_K = 32;
    
    @Value("${puzzle.csv.path:puzzles/lichess_db_puzzle.csv.zst}")
    private String puzzleCsvPath;
    
    @Value("${puzzle.max.load:100000}")
    private int maxPuzzlesToLoad;
    
    private final UserPuzzleSolutionRepository userPuzzleSolutionRepository;
    private final PuzzleRepository puzzleRepository;
    private final UserStatsRepository userStatsRepository;
    private final UserRepository userRepository;
    
    private Map<String, Puzzle> puzzleCache = new ConcurrentHashMap<>();
    private List<Puzzle> allPuzzles = null;
    private Map<Integer, List<Puzzle>> ratingIndex = new ConcurrentHashMap<>(); // Rating bucket -> puzzles
    private Random random = new Random();
    private volatile boolean initialized = false;
    private final CountDownLatch initLatch = new CountDownLatch(1);
    
    public PuzzleService(UserPuzzleSolutionRepository userPuzzleSolutionRepository,
                         PuzzleRepository puzzleRepository,
                         UserStatsRepository userStatsRepository,
                         UserRepository userRepository) {
        this.userPuzzleSolutionRepository = userPuzzleSolutionRepository;
        this.puzzleRepository = puzzleRepository;
        this.userStatsRepository = userStatsRepository;
        this.userRepository = userRepository;
    }
    
    /**
     * Initialize puzzle cache asynchronously on application startup
     */
    @PostConstruct
    public void init() {
        log.info("Starting asynchronous puzzle loading...");
        new Thread(() -> {
            try {
                loadAllPuzzles();
                log.info("Puzzle loading completed successfully");
            } catch (Exception e) {
                log.error("Failed to load puzzles on startup", e);
            }
        }).start();
    }
    
    /**
     * Get daily puzzle from CSV (deterministic: same puzzle for all users on the same day)
     */
    public PuzzleResponse getDailyPuzzle(String userId) {
        long daysSinceEpoch = System.currentTimeMillis() / (24 * 60 * 60 * 1000);
        Puzzle puzzle = getRandomPuzzleByIndex((int) (daysSinceEpoch % Integer.MAX_VALUE));
        if (puzzle == null) {
            log.error("Failed to load daily puzzle from CSV");
            throw new RuntimeException("No puzzle available");
        }
        puzzle.setDailyDate(LocalDateTime.now());
        log.info("Daily puzzle: {}", puzzle.getId());
        return toPuzzleResponse(puzzle, userId);
    }
    
    /**
     * Get random puzzle for training from CSV
     */
    public PuzzleResponse getRandomPuzzle(String userId, Integer minRating, Integer maxRating) {
        int min = minRating != null ? minRating : 1000;
        int max = maxRating != null ? maxRating : 2000;
        Puzzle puzzle = getRandomPuzzleByRating(min, max);
        if (puzzle == null) {
            log.error("Failed to load random puzzle from CSV with rating {} - {}", min, max);
            throw new RuntimeException("No puzzle available for rating " + min + "-" + max);
        }
        log.info("Random puzzle: {} (rating: {})", puzzle.getId(), puzzle.getRating());
        return toPuzzleResponse(puzzle, userId);
    }
    
    /**
     * Check user's puzzle solution and save progress to database
     */
    public Map<String, Object> checkSolution(String userId, String puzzleId, List<String> userMoves, Integer timeSpent) {
        try {
            Puzzle puzzle = puzzleCache.get(puzzleId);
            if (puzzle == null) {
                puzzle = getPuzzleById(puzzleId);
            }
            if (puzzle == null) {
                log.error("Puzzle not found: {}", puzzleId);
                throw new RuntimeException("Puzzle not found: " + puzzleId);
            }
            
            if (puzzle.getMoves() == null || puzzle.getMoves().isEmpty()) {
                log.error("Puzzle {} has no moves", puzzleId);
                throw new RuntimeException("Puzzle has no solution moves");
            }
            
            List<String> correctMoves = Arrays.asList(puzzle.getMoves().split(" "));
            
            log.info("Checking solution for puzzle {}: user moves {} vs correct moves {}", puzzleId, userMoves, correctMoves);
            
            // Check if solution is correct (compare first N moves where N = userMoves.size())
            boolean correct = userMoves.size() <= correctMoves.size() && 
                             correctMoves.subList(0, Math.min(userMoves.size(), correctMoves.size())).equals(userMoves);
            
            boolean isComplete = correct && userMoves.size() == correctMoves.size();
            
            log.info("Solution check result: correct={}, complete={}", correct, isComplete);
            
            // Save or update user's puzzle progress
            log.info("checkSolution for userId='{}', puzzleId='{}', isComplete={}", userId, puzzleId, isComplete);
            Integer puzzleRatingAfter = null;
            Integer puzzleRatingChange = 0;

            if (userId != null && !userId.equals("00000000-0000-0000-0000-000000000000")) {
                log.info("Saving puzzle progress for user");
                try {
                    UUID userUUID = UUID.fromString(userId);
                    log.info("Parsed UUID: {}", userUUID);
                    Optional<UserPuzzleSolution> existingSolution = userPuzzleSolutionRepository.findByUserIdAndPuzzleId(userUUID, puzzleId);
                    
                    UserPuzzleSolution solution;
                    boolean wasSolved = false;
                    boolean wasPenaltyApplied = false;
                    if (existingSolution.isPresent()) {
                        log.info("Found existing solution");
                        solution = existingSolution.get();
                        wasSolved = solution.isSolved();
                        wasPenaltyApplied = solution.isPenaltyApplied();
                        if (isComplete && !wasSolved) {
                            solution.setSolved(true);
                        }
                    } else {
                        log.info("Creating new solution with solved={}", isComplete);
                        solution = new UserPuzzleSolution();
                        solution.setUserId(userUUID);
                        solution.setPuzzleId(puzzleId);
                        wasSolved = false;
                        wasPenaltyApplied = false;
                        solution.setSolved(isComplete);
                    }

                    // Apply puzzle Elo changes
                    UserStats stats = getOrCreateUserStats(userUUID);
                    int currentPuzzleRating = stats.getPuzzleRating() != null ? stats.getPuzzleRating() : 1200;
                    puzzleRatingAfter = currentPuzzleRating;
                    if (!correct && !wasSolved && !wasPenaltyApplied) {
                        puzzleRatingChange = calculatePuzzleEloChange(currentPuzzleRating, puzzle.getRating(), false);
                        stats.setPuzzleRating(currentPuzzleRating + puzzleRatingChange);
                        solution.setPenaltyApplied(true);
                        puzzleRatingAfter = stats.getPuzzleRating();
                    } else if (isComplete && !wasSolved && !wasPenaltyApplied) {
                        puzzleRatingChange = calculatePuzzleEloChange(currentPuzzleRating, puzzle.getRating(), true);
                        stats.setPuzzleRating(currentPuzzleRating + puzzleRatingChange);
                        puzzleRatingAfter = stats.getPuzzleRating();
                    }
                    
                    log.info("About to save solution with solved={}", solution.isSolved());
                    
                    // Ensure puzzle exists in database (required for foreign key constraint)
                    try {
                        if (puzzleId != null && !puzzleRepository.existsById(puzzleId)) {
                            log.info("Puzzle {} not in database, saving it now", puzzleId);
                            puzzleRepository.save(puzzle);
                        }
                    } catch (Exception e) {
                        log.warn("Failed to ensure puzzle in database: {}", e.getMessage());
                    }
                    
                    userPuzzleSolutionRepository.save(solution);
                    userStatsRepository.save(stats);
                    log.info("Saved puzzle progress for user {} on puzzle {}: solved={}", userId, puzzleId, solution.isSolved());
                } catch (IllegalArgumentException e) {
                    log.error("Invalid user ID format: {}", userId, e);
                    throw e;
                } catch (Exception e) {
                    log.error("Failed to save puzzle progress: {}", e.getMessage(), e);
                    throw e;
                }
            } else {
                log.info("Skipping save: userId is null or anonymous");
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("correct", correct);
            result.put("complete", isComplete);
            result.put("nextMove", userMoves.size() < correctMoves.size() ? correctMoves.get(userMoves.size()) : null);
            result.put("solution", correctMoves);
            if (puzzleRatingAfter != null) {
                result.put("puzzleRating", puzzleRatingAfter);
                result.put("puzzleRatingChange", puzzleRatingChange);
            }
            
            return result;
        } catch (Exception e) {
            log.error("Error in checkSolution: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    // Helper methods
    
    private Puzzle getPuzzleById(String puzzleId) {
        try {
            // Wait for initialization if in progress
            if (!initialized) {
                log.info("Waiting for puzzle loading to complete...");
                try {
                    initLatch.await();
                } catch (InterruptedException e) {
                    log.error("Interrupted while waiting for puzzle loading", e);
                    Thread.currentThread().interrupt();
                    return null;
                }
            }
            
            List<Puzzle> puzzles = allPuzzles;
            if (puzzles == null) {
                log.error("Puzzles list is null after initialization");
                return null;
            }
            
            for (Puzzle p : puzzles) {
                if (p.getId().equals(puzzleId)) {
                    puzzleCache.put(puzzleId, p);
                    return p;
                }
            }
            log.warn("Puzzle not found: {}", puzzleId);
        } catch (Exception e) {
            log.error("Failed to find puzzle {}", puzzleId, e);
        }
        return null;
    }
    
    private Puzzle getRandomPuzzleByIndex(int index) {
        try {
            // Wait for initialization if in progress
            if (!initialized) {
                log.info("Waiting for puzzle loading to complete...");
                try {
                    initLatch.await();
                } catch (InterruptedException e) {
                    log.error("Interrupted while waiting for puzzle loading", e);
                    Thread.currentThread().interrupt();
                    return null;
                }
            }
            
            List<Puzzle> puzzles = allPuzzles;
            if (puzzles == null || puzzles.isEmpty()) {
                log.error("Puzzles list is null or empty");
                return null;
            }
            Puzzle puzzle = puzzles.get(Math.abs(index) % puzzles.size());
            puzzleCache.put(puzzle.getId(), puzzle);
            return puzzle;
        } catch (Exception e) {
            log.error("Failed to get puzzle by index", e);
        }
        return null;
    }
    
    private Puzzle getRandomPuzzleByRating(int minRating, int maxRating) {
        try {
            // Wait for initialization if in progress
            if (!initialized) {
                log.info("Waiting for puzzle loading to complete...");
                try {
                    initLatch.await();
                } catch (InterruptedException e) {
                    log.error("Interrupted while waiting for puzzle loading", e);
                    Thread.currentThread().interrupt();
                    return null;
                }
            }
            
            // Use rating index for faster lookup
            int minBucket = (minRating / RATING_BUCKET_SIZE) * RATING_BUCKET_SIZE;
            int maxBucket = (maxRating / RATING_BUCKET_SIZE) * RATING_BUCKET_SIZE;
            
            List<Puzzle> candidates = new ArrayList<>();
            for (int bucket = minBucket; bucket <= maxBucket; bucket += RATING_BUCKET_SIZE) {
                List<Puzzle> bucketPuzzles = ratingIndex.get(bucket);
                if (bucketPuzzles != null) {
                    for (Puzzle p : bucketPuzzles) {
                        if (p.getRating() >= minRating && p.getRating() <= maxRating) {
                            candidates.add(p);
                        }
                    }
                }
            }
            
            if (candidates.isEmpty()) {
                log.warn("No puzzles found for rating range {}-{}", minRating, maxRating);
                return null;
            }
            
            Puzzle puzzle = candidates.get(random.nextInt(candidates.size()));
            puzzleCache.put(puzzle.getId(), puzzle);
            return puzzle;
        } catch (Exception e) {
            log.error("Failed to get puzzle by rating", e);
        }
        return null;
    }
    
    private synchronized List<Puzzle> loadAllPuzzles() throws Exception {
        if (initialized && allPuzzles != null) {
            log.info("Returning cached puzzles: {} total", allPuzzles.size());
            return allPuzzles;
        }
        
        log.info("Loading puzzles from CSV file: {} (max: {})", puzzleCsvPath, maxPuzzlesToLoad);
        List<Puzzle> puzzles = new ArrayList<>(maxPuzzlesToLoad);
        Map<Integer, List<Puzzle>> tempIndex = new HashMap<>();
        
        ProcessBuilder pb = new ProcessBuilder("zstdcat", puzzleCsvPath);
        Process process = pb.start();
        
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()), 65536)) {
            String line;
            int lineNum = 0;
            int loadedCount = 0;
            
            while ((line = reader.readLine()) != null && (maxPuzzlesToLoad == 0 || loadedCount < maxPuzzlesToLoad)) {
                lineNum++;
                if (lineNum == 1 || line.trim().isEmpty()) continue; // skip header
                
                String[] parts = line.split(",", 10);
                if (parts.length < 4) continue;
                
                try {
                    Puzzle p = new Puzzle();
                    p.setId(parts[0].trim());
                    p.setFen(parts[1].trim());
                    p.setMoves(parts[2].trim());
                    int rating = Integer.parseInt(parts[3].trim());
                    p.setRating(rating);
                    
                    // Parse themes if available (index 7)
                    if (parts.length > 7 && !parts[7].trim().isEmpty()) {
                        p.setThemes(parts[7].trim());
                    }
                    p.setFetchedAt(LocalDateTime.now());
                    puzzles.add(p);
                    
                    // Add to rating index
                    int bucket = (rating / RATING_BUCKET_SIZE) * RATING_BUCKET_SIZE;
                    tempIndex.computeIfAbsent(bucket, k -> new ArrayList<>()).add(p);
                    
                    loadedCount++;
                    
                    if (loadedCount % 10000 == 0) {
                        log.info("  Loaded {} puzzles...", loadedCount);
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse puzzle line {}: {}", lineNum, e.getMessage());
                }
            }
        } finally {
            process.destroy();
        }
        
        log.info("Successfully loaded {} puzzles from CSV", puzzles.size());
        log.info("Created rating index with {} buckets", tempIndex.size());
        
        allPuzzles = puzzles;
        ratingIndex = new ConcurrentHashMap<>(tempIndex);
        initialized = true;
        initLatch.countDown();
        
        return puzzles;
    }
    
    private PuzzleResponse toPuzzleResponse(Puzzle puzzle, String userId) {
        PuzzleResponse response = new PuzzleResponse();
        response.setId(puzzle.getId());
        response.setFen(puzzle.getFen());
        response.setSolution(Arrays.asList(puzzle.getMoves().split(" ")));
        response.setRating(puzzle.getRating());
        response.setThemes(puzzle.getThemes() != null ? Arrays.asList(puzzle.getThemes().split(" ")) : Collections.emptyList());
        response.setDailyDate(puzzle.getDailyDate());
        
        // Check if user has already solved this puzzle and get user statistics
        boolean alreadySolved = false;
        Integer userPuzzleRating = null;
        
        if (userId != null && !userId.isEmpty() && !userId.equals("00000000-0000-0000-0000-000000000000")) {
            try {
                UUID userUUID = UUID.fromString(userId);
                log.debug("Checking if user {} has solved puzzle {}", userUUID, puzzle.getId());
                Optional<UserPuzzleSolution> solution = userPuzzleSolutionRepository.findByUserIdAndPuzzleId(userUUID, puzzle.getId());
                if (solution.isPresent()) {
                    alreadySolved = solution.get().isSolved();
                    log.info("Found existing puzzle solution for user {}: puzzleId={}, solved={}", userUUID, puzzle.getId(), alreadySolved);
                } else {
                    log.debug("No existing puzzle solution found for user {} on puzzle {}", userUUID, puzzle.getId());
                }
                
                UserStats stats = getOrCreateUserStats(userUUID);
                userPuzzleRating = stats.getPuzzleRating();
            } catch (IllegalArgumentException e) {
                log.warn("Invalid user ID format: {}", userId);
            }
        }
        
        response.setAlreadySolved(alreadySolved);
        response.setUserPuzzleRating(userPuzzleRating);
        return response;
    }

    private UserStats getOrCreateUserStats(UUID userId) {
        return userStatsRepository.findById(userId)
                .map(stats -> {
                    if (stats.getPuzzleRating() == null) {
                        stats.setPuzzleRating(1200);
                        return userStatsRepository.save(stats);
                    }
                    return stats;
                })
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found"));
                    UserStats stats = new UserStats();
                    stats.setUser(user);
                    stats.setPuzzleRating(1200);
                    return userStatsRepository.save(stats);
                });
    }

    private int calculatePuzzleEloChange(int userRating, int puzzleRating, boolean solved) {
        double expected = 1.0 / (1.0 + Math.pow(10.0, (puzzleRating - userRating) / 400.0));
        double score = solved ? 1.0 : 0.0;
        return (int) Math.round(PUZZLE_RATING_K * (score - expected));
    }

}
