package com.chessonline.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class MatchmakingJoinRequest {

    @NotBlank
    @Pattern(regexp = "bullet|blitz|rapid", message = "Invalid game mode")
    private String gameMode;

    @NotBlank
    private String timeControl;

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
