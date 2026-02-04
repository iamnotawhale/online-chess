package com.chessonline.dto;

import java.util.UUID;

public class MatchmakingJoinResponse {
    private boolean queued;
    private boolean matched;
    private UUID gameId;
    private String gameMode;
    private String timeControl;
    private String message;

    public boolean isQueued() {
        return queued;
    }

    public void setQueued(boolean queued) {
        this.queued = queued;
    }

    public boolean isMatched() {
        return matched;
    }

    public void setMatched(boolean matched) {
        this.matched = matched;
    }

    public UUID getGameId() {
        return gameId;
    }

    public void setGameId(UUID gameId) {
        this.gameId = gameId;
    }

    public String getGameMode() {
        return gameMode;
    }

    public void setGameMode(String gameMode) {
        this.gameMode = gameMode;
    }

    public String getTimeControl() {
        return timeControl;
    }

    public void setTimeControl(String timeControl) {
        this.timeControl = timeControl;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
