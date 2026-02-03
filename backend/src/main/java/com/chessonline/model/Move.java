package com.chessonline.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "moves")
public class Move {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(name = "move_number", nullable = false)
    private Integer moveNumber; // 1-based, increments every 2 moves (both players)

    @Column(nullable = false, length = 16)
    private String san; // Standard Algebraic Notation (e.g., "e4", "Nf3", "O-O")

    @Column(nullable = false, length = 255)
    private String fen; // FEN after this move

    @Column(name = "time_left_ms")
    private Integer timeLeftMs; // Time remaining after move (for time control validation)

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Constructors
    public Move() {}

    public Move(Game game, Integer moveNumber, String san, String fen) {
        this.game = game;
        this.moveNumber = moveNumber;
        this.san = san;
        this.fen = fen;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Game getGame() {
        return game;
    }

    public void setGame(Game game) {
        this.game = game;
    }

    public Integer getMoveNumber() {
        return moveNumber;
    }

    public void setMoveNumber(Integer moveNumber) {
        this.moveNumber = moveNumber;
    }

    public String getSan() {
        return san;
    }

    public void setSan(String san) {
        this.san = san;
    }

    public String getFen() {
        return fen;
    }

    public void setFen(String fen) {
        this.fen = fen;
    }

    public Integer getTimeLeftMs() {
        return timeLeftMs;
    }

    public void setTimeLeftMs(Integer timeLeftMs) {
        this.timeLeftMs = timeLeftMs;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
