package com.chessonline.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class RatingHistoryResponse {
    private UUID id;
    private UUID userId;
    private UUID gameId;
    private int ratingBefore;
    private int ratingAfter;
    private int ratingChange;
    private LocalDateTime createdAt;

    public RatingHistoryResponse() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public UUID getGameId() {
        return gameId;
    }

    public void setGameId(UUID gameId) {
        this.gameId = gameId;
    }

    public int getRatingBefore() {
        return ratingBefore;
    }

    public void setRatingBefore(int ratingBefore) {
        this.ratingBefore = ratingBefore;
    }

    public int getRatingAfter() {
        return ratingAfter;
    }

    public void setRatingAfter(int ratingAfter) {
        this.ratingAfter = ratingAfter;
    }

    public int getRatingChange() {
        return ratingChange;
    }

    public void setRatingChange(int ratingChange) {
        this.ratingChange = ratingChange;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
