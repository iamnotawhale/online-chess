package com.chessonline.dto;

import com.chessonline.model.BotDifficulty;
import com.fasterxml.jackson.annotation.JsonProperty;

public class CreateBotGameRequest {
    
    @JsonProperty("difficulty")
    private String difficulty;
    
    @JsonProperty("playerColor")
    private String playerColor = "random";
    
    @JsonProperty("timeControl")
    private String timeControl = "5+3";

    public CreateBotGameRequest() {}

    public CreateBotGameRequest(String difficulty, String playerColor, String timeControl) {
        this.difficulty = difficulty;
        this.playerColor = playerColor;
        this.timeControl = timeControl;
    }

    public BotDifficulty getDifficulty() {
        if (difficulty == null) {
            return BotDifficulty.INTERMEDIATE;
        }
        return BotDifficulty.valueOf(difficulty.toUpperCase());
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getPlayerColor() {
        return playerColor;
    }

    public void setPlayerColor(String playerColor) {
        this.playerColor = playerColor;
    }

    public String getTimeControl() {
        return timeControl;
    }

    public void setTimeControl(String timeControl) {
        this.timeControl = timeControl;
    }
}
