package com.chessonline.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "user_puzzle_solutions")
public class UserPuzzleSolution {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(nullable = false)
    private UUID userId;
    
    @Column(nullable = false)
    private String puzzleId;
    
    @Column(nullable = false)
    private boolean solved;

    @Column(name = "penalty_applied", nullable = false)
    private boolean penaltyApplied = false;
    
    
    // Getters and setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    
    public String getPuzzleId() { return puzzleId; }
    public void setPuzzleId(String puzzleId) { this.puzzleId = puzzleId; }
    
    public boolean isSolved() { return solved; }
    public void setSolved(boolean solved) { this.solved = solved; }

    public boolean isPenaltyApplied() { return penaltyApplied; }
    public void setPenaltyApplied(boolean penaltyApplied) { this.penaltyApplied = penaltyApplied; }
    
}
