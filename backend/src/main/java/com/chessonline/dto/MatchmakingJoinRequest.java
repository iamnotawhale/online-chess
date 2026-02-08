package com.chessonline.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class MatchmakingJoinRequest {

    @NotBlank
    @Pattern(regexp = "bullet|blitz|rapid|classic|custom", message = "Invalid game mode")
    private String gameMode;

    @NotBlank
    private String timeControl;

    @Pattern(regexp = "white|black|random", message = "Invalid preferred color")
    private String preferredColor;

    @JsonProperty("isRated")
    private boolean rated;

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

    public String getPreferredColor() {
        return preferredColor;
    }

    public void setPreferredColor(String preferredColor) {
        this.preferredColor = preferredColor;
    }

    public boolean isRated() {
        return rated;
    }

    public void setRated(boolean rated) {
        this.rated = rated;
    }
}
