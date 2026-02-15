package com.chessonline.dto;

import java.time.LocalDateTime;
import java.util.List;

public class PuzzleResponse {
    private String id;
    private String fen;
    private List<String> solution; // Solution moves in UCI format
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
    
    public List<String> getSolution() { return solution; }
    public void setSolution(List<String> solution) { this.solution = solution; }
    
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
