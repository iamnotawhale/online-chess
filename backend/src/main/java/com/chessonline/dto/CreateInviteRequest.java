package com.chessonline.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class CreateInviteRequest {

    @NotBlank(message = "Game mode is required")
    @Pattern(regexp = "rated|casual|standard|rapid|blitz|bullet|custom", message = "Invalid game mode")
    private String gameMode;

    @Pattern(regexp = "\\d+\\+\\d+", message = "Time control format must be 'minutes+increment' (e.g., 10+0)")
    private String timeControl;

    @Pattern(regexp = "white|black|random", message = "Invalid preferred color")
    private String preferredColor;

    private Integer expirationHours; // Optional, defaults to 24 in service

    @JsonProperty("isRated")
    private boolean rated = true;

    public CreateInviteRequest() {}

    public CreateInviteRequest(String gameMode, String timeControl, Integer expirationHours, boolean rated, String preferredColor) {
        this.gameMode = gameMode;
        this.timeControl = timeControl;
        this.expirationHours = expirationHours;
        this.rated = rated;
        this.preferredColor = preferredColor;
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

    public Integer getExpirationHours() {
        return expirationHours;
    }

    public void setExpirationHours(Integer expirationHours) {
        this.expirationHours = expirationHours;
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
