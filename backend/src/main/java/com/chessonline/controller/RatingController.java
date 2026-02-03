package com.chessonline.controller;

import com.chessonline.dto.RatingHistoryResponse;
import com.chessonline.model.RatingHistory;
import com.chessonline.service.RatingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ratings")
public class RatingController {

    @Autowired
    private RatingService ratingService;

    /**
     * Get current rating for authenticated user
     */
    @GetMapping("/me")
    public ResponseEntity<?> getMyRating(Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            int rating = ratingService.getCurrentRating(userId);
            return ResponseEntity.ok(Map.of("rating", rating));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get current rating for specific user
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<?> getUserRating(@PathVariable UUID userId) {
        try {
            int rating = ratingService.getCurrentRating(userId);
            return ResponseEntity.ok(Map.of("userId", userId, "rating", rating));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get rating history for authenticated user
     */
    @GetMapping("/me/history")
    public ResponseEntity<?> getMyRatingHistory(Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            List<RatingHistory> histories = ratingService.getUserRatingHistory(userId);
            List<RatingHistoryResponse> responses = histories.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get rating history for specific user
     */
    @GetMapping("/users/{userId}/history")
    public ResponseEntity<?> getUserRatingHistory(@PathVariable UUID userId) {
        try {
            List<RatingHistory> histories = ratingService.getUserRatingHistory(userId);
            List<RatingHistoryResponse> responses = histories.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get rating changes for a specific game
     */
    @GetMapping("/games/{gameId}")
    public ResponseEntity<?> getGameRatingChanges(@PathVariable UUID gameId) {
        try {
            List<RatingHistory> histories = ratingService.getGameRatingChanges(gameId);
            List<RatingHistoryResponse> responses = histories.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // Helper method
    private RatingHistoryResponse mapToResponse(RatingHistory history) {
        RatingHistoryResponse response = new RatingHistoryResponse();
        response.setId(history.getId());
        response.setUserId(history.getUser().getId());
        response.setGameId(history.getGame().getId());
        response.setRatingBefore(history.getRatingBefore());
        response.setRatingAfter(history.getRatingAfter());
        response.setRatingChange(history.getRatingChange());
        response.setCreatedAt(history.getCreatedAt());
        return response;
    }
}
