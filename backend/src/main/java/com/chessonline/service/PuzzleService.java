package com.chessonline.service;

import com.chessonline.model.Puzzle;
import com.chessonline.model.UserPuzzleSolution;
import com.chessonline.model.User;
import com.chessonline.model.UserStats;
import com.chessonline.model.PuzzleRatingHistory;
import com.chessonline.dto.PuzzleResponse;
import com.chessonline.repository.UserPuzzleSolutionRepository;
import com.chessonline.repository.PuzzleRepository;
import com.chessonline.repository.UserRepository;
import com.chessonline.repository.UserStatsRepository;
import com.chessonline.repository.PuzzleRatingHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import java.io.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
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
    
    @Value("${puzzle.max.load:250000}")
    private int maxPuzzlesToLoad;
    
    private final UserPuzzleSolutionRepository userPuzzleSolutionRepository;
    private final PuzzleRepository puzzleRepository;
    private final UserStatsRepository userStatsRepository;
    private final UserRepository userRepository;
    private final PuzzleRatingHistoryRepository puzzleRatingHistoryRepository;
    
    private Map<String, Puzzle> puzzleCache = new ConcurrentHashMap<>();
    private List<Puzzle> allPuzzles = null;
    private Map<Integer, List<Puzzle>> ratingIndex = new ConcurrentHashMap<>(); // Rating bucket -> puzzles
    private Random random = new Random();
    private volatile boolean initialized = false;
    private final CountDownLatch initLatch = new CountDownLatch(1);

    @PersistenceContext
    private EntityManager entityManager;
    
    public PuzzleService(UserPuzzleSolutionRepository userPuzzleSolutionRepository,
                         PuzzleRepository puzzleRepository,
                         UserStatsRepository userStatsRepository,
                         UserRepository userRepository,
                         PuzzleRatingHistoryRepository puzzleRatingHistoryRepository) {
        this.userPuzzleSolutionRepository = userPuzzleSolutionRepository;
        this.puzzleRepository = puzzleRepository;
        this.userStatsRepository = userStatsRepository;
        this.userRepository = userRepository;
        this.puzzleRatingHistoryRepository = puzzleRatingHistoryRepository;
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
     * Get random puzzle by opening tag and themes from DB
     */
    public PuzzleResponse getLessonPuzzle(
            String userId,
            String openingTag,
            List<String> themes,
            Integer minRating,
            Integer maxRating
    ) {
        int min = minRating != null ? minRating : 800;
        int max = maxRating != null ? maxRating : 2500;

        // Step 1: openingTag + themes + rating range
        Puzzle puzzle = getRandomPuzzleByOpeningAndThemes(openingTag, themes, min, max);
        if (puzzle != null) {
            log.info("Lesson puzzle found: {} (openingTag={}, themes={}, rating {}-{})", puzzle.getId(), openingTag, themes, min, max);
            return toPuzzleResponse(puzzle, userId);
        }

        // Step 2: openingTag + themes (NO rating range) - if themes were specified
        if (themes != null && !themes.isEmpty()) {
            log.warn("No puzzles found for openingTag={} themes={} rating {}-{}, trying without rating", openingTag, themes, min, max);
            puzzle = getRandomPuzzleByOpeningAndThemes(openingTag, themes, 800, 2500);
            if (puzzle != null) {
                log.info("Lesson puzzle found without rating: {} (openingTag={}, themes={})", puzzle.getId(), openingTag, themes);
                return toPuzzleResponse(puzzle, userId);
            }
        }

        // Step 3: openingTag (NO themes) + rating range
        log.warn("No puzzles found for openingTag={} without rating restriction, trying without themes", openingTag);
        puzzle = getRandomPuzzleByOpeningAndThemes(openingTag, Collections.emptyList(), min, max);
        if (puzzle != null) {
            log.info("Lesson puzzle found without themes: {} (openingTag={}, rating {}-{})", puzzle.getId(), openingTag, min, max);
            return toPuzzleResponse(puzzle, userId);
        }

        // Step 4: openingTag (NO themes, NO rating range)
        log.warn("No puzzles found for openingTag={} with rating range, trying without rating at all", openingTag);
        puzzle = getRandomPuzzleByOpeningAndThemes(openingTag, Collections.emptyList(), 800, 2500);
        if (puzzle != null) {
            log.info("Lesson puzzle found for opening only: {} (openingTag={})", puzzle.getId(), openingTag);
            return toPuzzleResponse(puzzle, userId);
        }

        // Step 5: rating range only (any opening) - fallback
        log.warn("No puzzles found for openingTag={} at all, fallback to rating-only", openingTag);
        puzzle = getRandomPuzzleByRating(min, max);
        if (puzzle != null) {
            log.info("Lesson puzzle found by rating only: {} (rating {}-{})", puzzle.getId(), min, max);
            return toPuzzleResponse(puzzle, userId);
        }

        // No puzzle found at all
        log.error("No puzzle found for any filters: openingTag={}, themes={}", openingTag, themes);
        throw new RuntimeException("No puzzle found for specified filters");
    }
    
    /**
     * Check user's puzzle solution and save progress to database
     */
    public Map<String, Object> checkSolution(String userId, String puzzleId, List<String> userMoves, Integer timeSpent, Boolean skipRatingUpdate) {
        try {
            Puzzle puzzle = puzzleCache.get(puzzleId);
            if (puzzle == null) {
                puzzle = findPuzzleById(puzzleId);
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
            boolean skipRating = Boolean.TRUE.equals(skipRatingUpdate);
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
                    int puzzleRatingBefore = currentPuzzleRating;
                    puzzleRatingAfter = currentPuzzleRating;
                    boolean shouldRecordHistory = false;
                    if (!skipRating) {
                        if (!correct && !wasSolved && !wasPenaltyApplied) {
                            puzzleRatingChange = calculatePuzzleEloChange(currentPuzzleRating, puzzle.getRating(), false);
                            stats.setPuzzleRating(currentPuzzleRating + puzzleRatingChange);
                            solution.setPenaltyApplied(true);
                            puzzleRatingAfter = stats.getPuzzleRating();
                            shouldRecordHistory = puzzleRatingChange != 0;
                        } else if (isComplete && !wasSolved && !wasPenaltyApplied) {
                            puzzleRatingChange = calculatePuzzleEloChange(currentPuzzleRating, puzzle.getRating(), true);
                            stats.setPuzzleRating(currentPuzzleRating + puzzleRatingChange);
                            puzzleRatingAfter = stats.getPuzzleRating();
                            shouldRecordHistory = puzzleRatingChange != 0;
                        }
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

                    if (!skipRating && shouldRecordHistory) {
                        recordPuzzleRatingHistory(stats.getUser(), puzzle, puzzleRatingBefore, puzzleRatingAfter, puzzleRatingChange);
                    }
                    
                    userPuzzleSolutionRepository.save(solution);
                    if (!skipRating) {
                        userStatsRepository.save(stats);
                    }
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
            // Don't send full solution to client for security
            if (!skipRating && puzzleRatingAfter != null) {
                result.put("puzzleRating", puzzleRatingAfter);
                result.put("puzzleRatingChange", puzzleRatingChange);
                
                // Include rating history in response
                try {
                    UUID userUUID = UUID.fromString(userId);
                    List<PuzzleRatingHistory> histories = puzzleRatingHistoryRepository.findTop8ByUserIdOrderByCreatedAtDesc(userUUID);
                    List<Integer> historyDeltas = histories.stream()
                        .map(PuzzleRatingHistory::getRatingChange)
                        .collect(Collectors.toList());
                    result.put("puzzleRatingHistory", historyDeltas);
                } catch (Exception e) {
                    log.warn("Failed to fetch puzzle rating history: {}", e.getMessage());
                }
            }
            
            return result;
        } catch (Exception e) {
            log.error("Error in checkSolution: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * Get hint for puzzle - returns next correct move without penalty
     */
    public Map<String, Object> getHint(String puzzleId, List<String> currentMoves) {
        try {
            Puzzle puzzle = puzzleCache.get(puzzleId);
            if (puzzle == null) {
                puzzle = findPuzzleById(puzzleId);
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
            
            // Validate that current moves are correct so far
            if (currentMoves.size() >= correctMoves.size()) {
                throw new RuntimeException("No more hints available - puzzle should be complete");
            }
            
            for (int i = 0; i < currentMoves.size(); i++) {
                if (!currentMoves.get(i).equals(correctMoves.get(i))) {
                    throw new RuntimeException("Current moves are incorrect - cannot provide hint");
                }
            }
            
            // Return the next correct move
            String nextMove = correctMoves.get(currentMoves.size());
            
            Map<String, Object> result = new HashMap<>();
            result.put("nextMove", nextMove);
            result.put("movesRemaining", correctMoves.size() - currentMoves.size() - 1);
            
            log.info("Hint provided for puzzle {}: move {}/{}", puzzleId, currentMoves.size() + 1, correctMoves.size());
            return result;
        } catch (Exception e) {
            log.error("Error getting hint: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    // Helper methods
    
    public PuzzleResponse getPuzzleById(String puzzleId, String userId) {
        String normalizedId = puzzleId == null ? "" : puzzleId.trim();
        Puzzle puzzle = puzzleCache.get(normalizedId);
        if (puzzle == null) {
            puzzle = findPuzzleById(normalizedId);
        }
        if (puzzle == null) {
            puzzle = findPuzzleInDatabase(normalizedId);
        }

        if (puzzle == null) {
            throw new RuntimeException("Puzzle not found: " + normalizedId);
        }

        return toPuzzleResponse(puzzle, userId);
    }

    private Puzzle findPuzzleById(String puzzleId) {
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

    private Puzzle findPuzzleInDatabase(String puzzleId) {
        if (puzzleId == null || puzzleId.isBlank()) {
            return null;
        }

        try {
            Optional<Puzzle> exact = puzzleRepository.findById(puzzleId);
            if (exact.isPresent()) {
                Puzzle puzzle = exact.get();
                puzzleCache.put(puzzleId, puzzle);
                puzzleCache.put(puzzle.getId(), puzzle);
                return puzzle;
            }

            Optional<Puzzle> ignoreCase = puzzleRepository.findByIdIgnoreCase(puzzleId);
            if (ignoreCase.isPresent()) {
                Puzzle puzzle = ignoreCase.get();
                puzzleCache.put(puzzleId, puzzle);
                puzzleCache.put(puzzle.getId(), puzzle);
                return puzzle;
            }
        } catch (Exception e) {
            log.error("Failed to find puzzle {} in database", puzzleId, e);
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
                    if (parts.length > 9 && !parts[9].trim().isEmpty()) {
                        p.setOpeningTags(parts[9].trim());
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

    private Puzzle getRandomPuzzleByOpeningAndThemes(
            String openingTag,
            List<String> themes,
            int minRating,
            int maxRating
    ) {
        if (openingTag == null || openingTag.isBlank()) {
            return null;
        }

        StringBuilder sql = new StringBuilder(
            "SELECT * FROM puzzles WHERE opening_tags ILIKE :openingTag AND rating BETWEEN :minRating AND :maxRating"
        );

        if (themes != null && !themes.isEmpty()) {
            int index = 0;
            StringBuilder themeClause = new StringBuilder();
            for (String theme : themes) {
                if (theme == null || theme.isBlank()) {
                    continue;
                }
                if (themeClause.length() > 0) {
                    themeClause.append(" OR ");
                }
                themeClause.append("themes ILIKE :theme").append(index);
                index++;
            }
            if (themeClause.length() > 0) {
                sql.append(" AND (").append(themeClause).append(")");
            }
        }

        sql.append(" ORDER BY RANDOM() LIMIT 1");

        Query query = entityManager.createNativeQuery(sql.toString(), Puzzle.class);
        query.setParameter("openingTag", openingTag + "%");
        query.setParameter("minRating", minRating);
        query.setParameter("maxRating", maxRating);

        if (themes != null && !themes.isEmpty()) {
            int index = 0;
            for (String theme : themes) {
                if (theme == null || theme.isBlank()) {
                    continue;
                }
                query.setParameter("theme" + index, "%" + theme + "%");
                index++;
            }
        }

        List<Puzzle> results = query.getResultList();
        return results.isEmpty() ? null : results.get(0);
    }
    
    private PuzzleResponse toPuzzleResponse(Puzzle puzzle, String userId) {
        PuzzleResponse response = new PuzzleResponse();
        response.setId(puzzle.getId());
        response.setFen(puzzle.getFen());
        // Only send first move for security - full solution stays on server
        String[] moves = puzzle.getMoves().split(" ");
        response.setFirstMove(moves.length > 0 ? moves[0] : null);
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

    public int getCurrentPuzzleRating(UUID userId) {
        UserStats stats = getOrCreateUserStats(userId);
        return stats.getPuzzleRating() != null ? stats.getPuzzleRating() : 1200;
    }

    public List<PuzzleRatingHistory> getUserPuzzleRatingHistory(UUID userId) {
        return puzzleRatingHistoryRepository.findTop8ByUserIdOrderByCreatedAtDesc(userId);
    }

    private void recordPuzzleRatingHistory(User user, Puzzle puzzle, int ratingBefore, int ratingAfter, int change) {
        if (user == null || puzzle == null) {
            return;
        }
        PuzzleRatingHistory history = new PuzzleRatingHistory();
        history.setUser(user);
        history.setPuzzle(puzzle);
        history.setRatingBefore(ratingBefore);
        history.setRatingAfter(ratingAfter);
        history.setRatingChange(change);
        puzzleRatingHistoryRepository.save(history);
    }

}
