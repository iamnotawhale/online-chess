package com.chessonline.dto.user;

public class UserStatsResponse {

    private int wins;
    private int losses;
    private int draws;
    private int totalGames;

    public UserStatsResponse(int wins, int losses, int draws, int totalGames) {
        this.wins = wins;
        this.losses = losses;
        this.draws = draws;
        this.totalGames = totalGames;
    }

    public int getWins() {
        return wins;
    }

    public int getLosses() {
        return losses;
    }

    public int getDraws() {
        return draws;
    }

    public int getTotalGames() {
        return totalGames;
    }
}
