package com.chessonline.model;

public enum BotDifficulty {
    BEGINNER(1, -2, 1150),
    INTERMEDIATE(4, 3, 1400),
    ADVANCED(7, 9, 1700),
    EXPERT(11, 15, 2000);

    private final int depth;
    private final int skillLevel;
    private final int elo;

    BotDifficulty(int depth, int skillLevel, int elo) {
        this.depth = depth;
        this.skillLevel = skillLevel;
        this.elo = elo;
    }

    public int getDepth() {
        return depth;
    }

    public int getSkillLevel() {
        return skillLevel;
    }

    public int getElo() {
        return elo;
    }
}
