package com.chessonline.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "puzzles")
public class Puzzle {
    @Id
    private String id; // Lichess puzzle ID
    
    @Column(nullable = false, length = 100)
    private String fen; // Starting position
    
    @Column(nullable = false, length = 500)
    private String moves; // Solution moves (space-separated UCI format)
    
    @Column(nullable = false)
    private int rating; // Puzzle difficulty rating
    
    @Column(nullable = false)
    private int ratingDeviation;
    
    @Column(length = 200)
    private String themes; // Comma-separated themes (e.g., "endgame,mate")

    @Column(name = "opening_tags", length = 200)
    private String openingTags; // Space-separated opening tags from Lichess
    
    @Column(nullable = false)
    private LocalDateTime fetchedAt;
    
    // Daily puzzle specific
    @Column
    private LocalDateTime dailyDate;
    
    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getFen() { return fen; }
    public void setFen(String fen) { this.fen = fen; }
    
    public String getMoves() { return moves; }
    public void setMoves(String moves) { this.moves = moves; }
    
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    
    public int getRatingDeviation() { return ratingDeviation; }
    public void setRatingDeviation(int ratingDeviation) { this.ratingDeviation = ratingDeviation; }
    
    public String getThemes() { return themes; }
    public void setThemes(String themes) { this.themes = themes; }

    public String getOpeningTags() { return openingTags; }
    public void setOpeningTags(String openingTags) { this.openingTags = openingTags; }
    
    public LocalDateTime getFetchedAt() { return fetchedAt; }
    public void setFetchedAt(LocalDateTime fetchedAt) { this.fetchedAt = fetchedAt; }
    
    public LocalDateTime getDailyDate() { return dailyDate; }
    public void setDailyDate(LocalDateTime dailyDate) { this.dailyDate = dailyDate; }
}
