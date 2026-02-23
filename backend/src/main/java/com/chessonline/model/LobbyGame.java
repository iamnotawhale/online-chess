package com.chessonline.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "lobby_games")
public class LobbyGame {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    @Column(nullable = false)
    private String gameMode; // "custom"

    @Column(nullable = false)
    private String timeControl; // "5+3"

    @Column(nullable = false)
    private String preferredColor; // "white", "black", "random"

    @Column(nullable = false)
    private boolean rated; // whether the game is rated

    @Column(nullable = false)
    private LocalDateTime createdAt;

    public LobbyGame() {
    }

    public LobbyGame(User creator, String gameMode, String timeControl, String preferredColor, boolean rated) {
        this.creator = creator;
        this.gameMode = gameMode;
        this.timeControl = timeControl;
        this.preferredColor = preferredColor;
        this.rated = rated;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getCreator() {
        return creator;
    }

    public void setCreator(User creator) {
        this.creator = creator;
    }

    public String getGameMode() {
        return gameMode;
    }

    public void setGameMode(String gameMode) {
        this.gameMode = gameMode;
    }

    public String getTimeControl() {
        return timeControl;
    }

    public void setTimeControl(String timeControl) {
        this.timeControl = timeControl;
    }

    public String getPreferredColor() {
        return preferredColor;
    }

    public void setPreferredColor(String preferredColor) {
        this.preferredColor = preferredColor;
    }

    public boolean isRated() {
        return rated;
    }

    public void setRated(boolean rated) {
        this.rated = rated;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
