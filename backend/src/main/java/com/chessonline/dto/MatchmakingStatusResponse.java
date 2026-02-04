package com.chessonline.dto;

public class MatchmakingStatusResponse {
    private boolean queued;
    private boolean matched;
    private String gameId;
    private String gameMode;
    private String timeControl;

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

    public String getGameId() {
        return gameId;
    }

    public void setGameId(String gameId) {
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
}
