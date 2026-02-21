package com.chessonline.dto;

import java.util.List;

public class CheckPuzzleSolutionRequest {
    private String puzzleId;
    private List<String> moves; // User's attempted moves in UCI format
    private Integer timeSpentSeconds;
    private Boolean skipRatingUpdate;
    
    // Getters and setters
    public String getPuzzleId() { return puzzleId; }
    public void setPuzzleId(String puzzleId) { this.puzzleId = puzzleId; }
    
    public List<String> getMoves() { return moves; }
    public void setMoves(List<String> moves) { this.moves = moves; }
    
    public Integer getTimeSpentSeconds() { return timeSpentSeconds; }
    public void setTimeSpentSeconds(Integer timeSpentSeconds) { this.timeSpentSeconds = timeSpentSeconds; }

    public Boolean getSkipRatingUpdate() { return skipRatingUpdate; }
    public void setSkipRatingUpdate(Boolean skipRatingUpdate) { this.skipRatingUpdate = skipRatingUpdate; }
}
