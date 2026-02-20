package com.chessonline.dto;

import java.util.List;

public class PuzzleHintRequest {
    private String puzzleId;
    private List<String> currentMoves;

    public String getPuzzleId() {
        return puzzleId;
    }

    public void setPuzzleId(String puzzleId) {
        this.puzzleId = puzzleId;
    }

    public List<String> getCurrentMoves() {
        return currentMoves;
    }

    public void setCurrentMoves(List<String> currentMoves) {
        this.currentMoves = currentMoves;
    }
}
