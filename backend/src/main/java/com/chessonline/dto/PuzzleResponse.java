package com.chessonline.dto;

import java.time.LocalDateTime;
import java.util.List;

public class PuzzleResponse {
    private String id;
    private String fen;
    private String firstMove; // Only first opponent move (not full solution for security)
    private int rating;
    private List<String> themes;
    private boolean alreadySolved;
    
    // For daily puzzle
    private LocalDateTime dailyDate;
    
    private Integer userPuzzleRating;
    
    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getFen() { return fen; }
    public void setFen(String fen) { this.fen = fen; }
    
    public String getFirstMove() { return firstMove; }
    public void setFirstMove(String firstMove) { this.firstMove = firstMove; }
    
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    
    public List<String> getThemes() { return themes; }
    public void setThemes(List<String> themes) { this.themes = themes; }
    
    public boolean isAlreadySolved() { return alreadySolved; }
    public void setAlreadySolved(boolean alreadySolved) { this.alreadySolved = alreadySolved; }
    
    public LocalDateTime getDailyDate() { return dailyDate; }
    public void setDailyDate(LocalDateTime dailyDate) { this.dailyDate = dailyDate; }
    
    public Integer getUserPuzzleRating() { return userPuzzleRating; }
    public void setUserPuzzleRating(Integer userPuzzleRating) { this.userPuzzleRating = userPuzzleRating; }
}
