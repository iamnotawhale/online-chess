package com.chessonline.model;

public enum BotDifficulty {
    BEGINNER(5),
    INTERMEDIATE(10),
    ADVANCED(15),
    EXPERT(20);

    private final int depth;

    BotDifficulty(int depth) {
        this.depth = depth;
    }

    public int getDepth() {
        return depth;
    }
}
