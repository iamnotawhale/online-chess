package com.chessonline.controller;

import com.chessonline.dto.CheckPuzzleSolutionRequest;
import com.chessonline.dto.PuzzleResponse;
import com.chessonline.dto.PuzzleRatingHistoryResponse;
import com.chessonline.dto.PuzzleHintRequest;
import com.chessonline.model.PuzzleRatingHistory;
import com.chessonline.service.PuzzleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/puzzles")
public class PuzzleController {
    
    private static final Logger log = LoggerFactory.getLogger(PuzzleController.class);
    private static final String ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000";
    
    @Autowired
    private PuzzleService puzzleService;
    
    /**
     * Get daily puzzle
     */
    @GetMapping("/daily")
    public ResponseEntity<PuzzleResponse> getDailyPuzzle(Authentication authentication) {
        String userId = authentication != null ? authentication.getName() : ANONYMOUS_USER_ID;
        log.info("User {} requested daily puzzle", userId);
        
        PuzzleResponse puzzle = puzzleService.getDailyPuzzle(userId);
        return ResponseEntity.ok(puzzle);
    }
    
    /**
     * Get random puzzle for training
     */
    @GetMapping("/random")
    public ResponseEntity<PuzzleResponse> getRandomPuzzle(
            Authentication authentication,
            @RequestParam(required = false) Integer minRating,
            @RequestParam(required = false) Integer maxRating
    ) {
        String userId = authentication != null ? authentication.getName() : ANONYMOUS_USER_ID;
        log.info("User {} requested random puzzle (rating range: {}-{})", userId, minRating, maxRating);
        
        PuzzleResponse puzzle = puzzleService.getRandomPuzzle(userId, minRating, maxRating);
        return ResponseEntity.ok(puzzle);
    }

    /**
     * Get puzzle by id (for shared deep-links)
     */
    @GetMapping("/{puzzleId}")
    public ResponseEntity<PuzzleResponse> getPuzzleById(
            Authentication authentication,
            @PathVariable String puzzleId
    ) {
        String userId = authentication != null ? authentication.getName() : ANONYMOUS_USER_ID;
        log.info("User {} requested puzzle by id {}", userId, puzzleId);

        PuzzleResponse puzzle = puzzleService.getPuzzleById(puzzleId, userId);
        return ResponseEntity.ok(puzzle);
    }

    /**
     * Get lesson puzzle by opening tag and themes
     */
    @GetMapping("/lesson")
    public ResponseEntity<PuzzleResponse> getLessonPuzzle(
            Authentication authentication,
            @RequestParam String openingTag,
            @RequestParam(required = false) String themes,
            @RequestParam(required = false) Integer minRating,
            @RequestParam(required = false) Integer maxRating
    ) {
        String userId = authentication != null ? authentication.getName() : ANONYMOUS_USER_ID;
        List<String> themeList = themes == null || themes.isBlank()
                ? List.of()
                : Arrays.stream(themes.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());

        log.info("User {} requested lesson puzzle (openingTag={}, themes={})", userId, openingTag, themeList);
        PuzzleResponse puzzle = puzzleService.getLessonPuzzle(userId, openingTag, themeList, minRating, maxRating);
        return ResponseEntity.ok(puzzle);
    }
    
    /**
     * Check puzzle solution
     */
    @PostMapping("/check")
    public ResponseEntity<Map<String, Object>> checkSolution(
            Authentication authentication,
            @RequestBody CheckPuzzleSolutionRequest request
    ) {
        String userId = authentication != null ? authentication.getName() : ANONYMOUS_USER_ID;
        log.info("User {} checking solution for puzzle {}", userId, request.getPuzzleId());
        
        Map<String, Object> result = puzzleService.checkSolution(
            userId, 
            request.getPuzzleId(), 
            request.getMoves(),
            request.getTimeSpentSeconds(),
            request.getSkipRatingUpdate()
        );
        
        return ResponseEntity.ok(result);
    }

    /**
     * Get hint for puzzle - returns next correct move
     */
    @PostMapping("/hint")
    public ResponseEntity<?> getHint(
            Authentication authentication,
            @RequestBody PuzzleHintRequest request
    ) {
        try {
            log.info("User requested hint for puzzle {}", request.getPuzzleId());
            Map<String, Object> result = puzzleService.getHint(
                request.getPuzzleId(),
                request.getCurrentMoves()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Error getting hint: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get current puzzle rating for authenticated user
     */
    @GetMapping("/me/rating")
    public ResponseEntity<?> getMyPuzzleRating(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            UUID userId = UUID.fromString(authentication.getName());
            int rating = puzzleService.getCurrentPuzzleRating(userId);
            return ResponseEntity.ok(Map.of("rating", rating));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get puzzle rating history for authenticated user
     */
    @GetMapping("/me/history")
    public ResponseEntity<?> getMyPuzzleRatingHistory(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            UUID userId = UUID.fromString(authentication.getName());
            List<PuzzleRatingHistory> histories = puzzleService.getUserPuzzleRatingHistory(userId);
            List<PuzzleRatingHistoryResponse> responses = histories.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    private PuzzleRatingHistoryResponse mapToResponse(PuzzleRatingHistory history) {
        PuzzleRatingHistoryResponse response = new PuzzleRatingHistoryResponse();
        response.setId(history.getId());
        response.setUserId(history.getUser().getId());
        response.setPuzzleId(history.getPuzzle().getId());
        response.setRatingBefore(history.getRatingBefore());
        response.setRatingAfter(history.getRatingAfter());
        response.setRatingChange(history.getRatingChange());
        response.setCreatedAt(history.getCreatedAt());
        return response;
    }
}
