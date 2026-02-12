package com.chessonline.controller;

import com.chessonline.dto.CheckPuzzleSolutionRequest;
import com.chessonline.dto.PuzzleResponse;
import com.chessonline.service.PuzzleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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
            request.getTimeSpentSeconds()
        );
        
        return ResponseEntity.ok(result);
    }
}
