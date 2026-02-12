package com.chessonline.service;

import com.chessonline.model.Puzzle;
import com.chessonline.dto.PuzzleResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class PuzzleService {
    
    private static final Logger log = LoggerFactory.getLogger(PuzzleService.class);
    
    @Value("${puzzle.csv.path:puzzles/lichess_db_puzzle.csv.zst}")
    private String puzzleCsvPath;
    
    private Map<String, Puzzle> puzzleCache = new HashMap<>();
    private List<Puzzle> allPuzzles = null;
    private Random random = new Random();
    private boolean initialized = false;
    
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
        return toPuzzleResponse(puzzle);
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
        return toPuzzleResponse(puzzle);
    }
    
    /**
     * Check user's puzzle solution
     */
    public Map<String, Object> checkSolution(String userId, String puzzleId, List<String> userMoves, Integer timeSpent) {
        Puzzle puzzle = puzzleCache.get(puzzleId);
        if (puzzle == null) {
            puzzle = getPuzzleById(puzzleId);
        }
        if (puzzle == null) {
            throw new RuntimeException("Puzzle not found: " + puzzleId);
        }
        List<String> correctMoves = Arrays.asList(puzzle.getMoves().split(" "));
        
        log.info("Checking solution for puzzle {}: user moves {} vs correct moves {}", puzzleId, userMoves, correctMoves);
        
        // Check if solution is correct (compare first N moves where N = userMoves.size())
        boolean correct = userMoves.size() <= correctMoves.size() && 
                         correctMoves.subList(0, Math.min(userMoves.size(), correctMoves.size())).equals(userMoves);
        
        log.info("Solution check result: correct={}, complete={}", correct, correct && userMoves.size() == correctMoves.size());
        
        Map<String, Object> result = new HashMap<>();
        result.put("correct", correct);
        result.put("complete", correct && userMoves.size() == correctMoves.size());
        result.put("nextMove", userMoves.size() < correctMoves.size() ? correctMoves.get(userMoves.size()) : null);
        result.put("solution", correctMoves);
        result.put("attempts", 0);
        
        return result;
    }
    
    // Helper methods
    
    private Puzzle getPuzzleById(String puzzleId) {
        try {
            List<Puzzle> allPuzzles = loadAllPuzzles();
            for (Puzzle p : allPuzzles) {
                if (p.getId().equals(puzzleId)) {
                    puzzleCache.put(puzzleId, p);
                    return p;
                }
            }
        } catch (Exception e) {
            log.error("Failed to find puzzle {}", puzzleId, e);
        }
        return null;
    }
    
    private Puzzle getRandomPuzzleByIndex(int index) {
        try {
            List<Puzzle> puzzles = loadAllPuzzles();
            if (puzzles.isEmpty()) return null;
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
            List<Puzzle> puzzles = loadAllPuzzles();
            List<Puzzle> filtered = new ArrayList<>();
            for (Puzzle p : puzzles) {
                if (p.getRating() >= minRating && p.getRating() <= maxRating) {
                    filtered.add(p);
                }
            }
            if (filtered.isEmpty()) return null;
            Puzzle puzzle = filtered.get(random.nextInt(filtered.size()));
            puzzleCache.put(puzzle.getId(), puzzle);
            return puzzle;
        } catch (Exception e) {
            log.error("Failed to get puzzle by rating", e);
        }
        return null;
    }
    
    private List<Puzzle> loadAllPuzzles() throws Exception {
        if (initialized && allPuzzles != null) {
            log.info("Returning cached puzzles: {} total", allPuzzles.size());
            return allPuzzles;
        }
        
        log.info("Loading puzzles from CSV file: {}", puzzleCsvPath);
        List<Puzzle> puzzles = new ArrayList<>();
        ProcessBuilder pb = new ProcessBuilder("zstdcat", puzzleCsvPath);
        Process process = pb.start();
        
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            int lineNum = 0;
            while ((line = reader.readLine()) != null) {
                lineNum++;
                if (lineNum == 1 || line.trim().isEmpty()) continue; // skip header
                String[] parts = line.split(",", 10);
                if (parts.length < 4) continue;
                try {
                    Puzzle p = new Puzzle();
                    p.setId(parts[0].trim());
                    p.setFen(parts[1].trim());
                    p.setMoves(parts[2].trim());
                    p.setRating(Integer.parseInt(parts[3].trim()));
                    // Parse themes if available (index 7)
                    if (parts.length > 7 && !parts[7].trim().isEmpty()) {
                        p.setThemes(parts[7].trim());
                    }
                    p.setFetchedAt(LocalDateTime.now());
                    puzzles.add(p);
                    if (lineNum % 10000 == 0) {
                        log.info("  Loaded {} puzzles...", lineNum);
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse puzzle line {}: {}", lineNum, line, e);
                }
            }
        } finally {
            process.waitFor();
        }
        
        log.info("Successfully loaded {} puzzles from CSV", puzzles.size());
        allPuzzles = puzzles;
        initialized = true;
        return puzzles;
    }
    
    private PuzzleResponse toPuzzleResponse(Puzzle puzzle) {
        PuzzleResponse response = new PuzzleResponse();
        response.setId(puzzle.getId());
        response.setFen(puzzle.getFen());
        response.setSolution(Arrays.asList(puzzle.getMoves().split(" ")));
        response.setRating(puzzle.getRating());
        response.setThemes(puzzle.getThemes() != null ? Arrays.asList(puzzle.getThemes().split(" ")) : Collections.emptyList());
        response.setDailyDate(puzzle.getDailyDate());
        response.setAlreadySolved(false);
        response.setPreviousAttempts(null);
        response.setTotalSolved(0L);
        response.setTotalAttempts(0L);
        return response;
    }

}
