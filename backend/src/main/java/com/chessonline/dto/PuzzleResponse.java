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
    private Integer previousAttempts;
    
    // For daily puzzle
    private LocalDateTime dailyDate;
    
    // Statistics
    private Long totalSolved;
    private Long totalAttempts;
    
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
    
    public Integer getPreviousAttempts() { return previousAttempts; }
    public void setPreviousAttempts(Integer previousAttempts) { this.previousAttempts = previousAttempts; }
    
    public LocalDateTime getDailyDate() { return dailyDate; }
    public void setDailyDate(LocalDateTime dailyDate) { this.dailyDate = dailyDate; }
    
    public Long getTotalSolved() { return totalSolved; }
    public void setTotalSolved(Long totalSolved) { this.totalSolved = totalSolved; }
    
    public Long getTotalAttempts() { return totalAttempts; }
    public void setTotalAttempts(Long totalAttempts) { this.totalAttempts = totalAttempts; }
}
