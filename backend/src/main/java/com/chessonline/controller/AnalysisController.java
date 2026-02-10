package com.chessonline.controller;

import com.chessonline.dto.AnalysisRequest;
import com.chessonline.dto.AnalysisResponse;
import com.chessonline.service.AnalysisService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/games")
public class AnalysisController {
    private static final Logger logger = LoggerFactory.getLogger(AnalysisController.class);
    
    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    /**
     * Analyze a chess game using Stockfish
     * POST /api/games/{gameId}/analyze
     */
    @PostMapping("/{gameId}/analyze")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> analyzeGame(@PathVariable String gameId, @RequestBody AnalysisRequest request) {
        try {
            logger.info("Received analysis request for game: {}", gameId);
            
            // Validate request
            if (request.getMoves() == null || request.getMoves().isEmpty()) {
                return ResponseEntity.badRequest().body("Moves list cannot be empty");
            }
            
            // Set gameId from path if not in request body
            request.setGameId(gameId);
            
            // Perform analysis
            AnalysisResponse response = analysisService.analyzeGame(request);
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            logger.error("Invalid request for game {}: {}", gameId, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
            
        } catch (Exception e) {
            logger.error("Error analyzing game {}", gameId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Analysis failed: " + e.getMessage());
        }
    }
}
