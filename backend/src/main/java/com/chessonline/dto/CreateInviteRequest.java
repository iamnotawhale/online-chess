package com.chessonline.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class CreateInviteRequest {

    @NotBlank(message = "Game mode is required")
    @Pattern(regexp = "standard|rapid|blitz|bullet", message = "Invalid game mode")
    private String gameMode;

    @Pattern(regexp = "\\d+\\+\\d+", message = "Time control format must be 'minutes+increment' (e.g., 10+0)")
    private String timeControl;

    private Integer expirationHours; // Optional, defaults to 24 in service

    public CreateInviteRequest() {}

    public CreateInviteRequest(String gameMode, String timeControl, Integer expirationHours) {
        this.gameMode = gameMode;
        this.timeControl = timeControl;
        this.expirationHours = expirationHours;
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
}
