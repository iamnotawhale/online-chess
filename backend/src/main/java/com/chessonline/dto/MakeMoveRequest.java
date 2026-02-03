package com.chessonline.dto;

import jakarta.validation.constraints.NotBlank;

public class MakeMoveRequest {

    @NotBlank(message = "Move in SAN notation is required")
    private String move; // e.g., "e4", "Nf3", "O-O"

    public MakeMoveRequest() {}

    public String getMove() {
        return move;
    }

    public void setMove(String move) {
        this.move = move;
    }
}
