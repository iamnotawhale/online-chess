package com.chessonline.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class CreateLobbyGameRequest {
    @NotBlank
    @Pattern(regexp = "custom")
    private String gameMode;

    @NotBlank
    @Pattern(regexp = "\\d+\\+\\d+")
    private String timeControl;

    @NotBlank
    @Pattern(regexp = "white|black|random")
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
