package com.chessonline.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class GameResponse {
    private UUID id;
    private UUID whitePlayerId;
    private String whiteUsername;
    private UUID blackPlayerId;
    private String blackUsername;
    private String status;
    private String result;
    private String resultReason;
    private String timeControl;
    private boolean rated;
    private String fenCurrent;
    private Long whiteTimeLeftMs;
    private Long blackTimeLeftMs;
    private LocalDateTime lastMoveAt;
    private Integer moveCount;
    private LocalDateTime createdAt;
    private LocalDateTime finishedAt;
    private UUID drawOfferedById;
    private Integer ratingChange;

    public GameResponse() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getWhitePlayerId() {
        return whitePlayerId;
    }

    public void setWhitePlayerId(UUID whitePlayerId) {
        this.whitePlayerId = whitePlayerId;
    }

    public String getWhiteUsername() {
        return whiteUsername;
    }

    public void setWhiteUsername(String whiteUsername) {
        this.whiteUsername = whiteUsername;
    }

    public UUID getBlackPlayerId() {
        return blackPlayerId;
    }

    public void setBlackPlayerId(UUID blackPlayerId) {
        this.blackPlayerId = blackPlayerId;
    }

    public String getBlackUsername() {
        return blackUsername;
    }

    public void setBlackUsername(String blackUsername) {
        this.blackUsername = blackUsername;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public String getResultReason() {
        return resultReason;
    }

    public void setResultReason(String resultReason) {
        this.resultReason = resultReason;
    }

    public String getTimeControl() {
        return timeControl;
    }

    public void setTimeControl(String timeControl) {
        this.timeControl = timeControl;
    }

    public boolean isRated() {
        return rated;
    }

    public void setRated(boolean rated) {
        this.rated = rated;
    }

    public String getFenCurrent() {
        return fenCurrent;
    }

    public void setFenCurrent(String fenCurrent) {
        this.fenCurrent = fenCurrent;
    }

    public Long getWhiteTimeLeftMs() {
        return whiteTimeLeftMs;
    }

    public void setWhiteTimeLeftMs(Long whiteTimeLeftMs) {
        this.whiteTimeLeftMs = whiteTimeLeftMs;
    }

    public Long getBlackTimeLeftMs() {
        return blackTimeLeftMs;
    }

    public void setBlackTimeLeftMs(Long blackTimeLeftMs) {
        this.blackTimeLeftMs = blackTimeLeftMs;
    }

    public LocalDateTime getLastMoveAt() {
        return lastMoveAt;
    }

    public void setLastMoveAt(LocalDateTime lastMoveAt) {
        this.lastMoveAt = lastMoveAt;
    }

    public Integer getMoveCount() {
        return moveCount;
    }

    public void setMoveCount(Integer moveCount) {
        this.moveCount = moveCount;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(LocalDateTime finishedAt) {
        this.finishedAt = finishedAt;
    }

    public UUID getDrawOfferedById() {
        return drawOfferedById;
    }

    public void setDrawOfferedById(UUID drawOfferedById) {
        this.drawOfferedById = drawOfferedById;
    }

    public Integer getRatingChange() {
        return ratingChange;
    }

    public void setRatingChange(Integer ratingChange) {
        this.ratingChange = ratingChange;
    }
}
