package com.chessonline.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "arena_participants")
@IdClass(ArenaParticipant.ArenaParticipantId.class)
public class ArenaParticipant {

    @Id
    @Column(name = "arena_id", columnDefinition = "uuid")
    private UUID arenaId;

    @Id
    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "arena_id", insertable = false, updatable = false)
    private Arena arena;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @Column(nullable = false)
    private Integer score = 0;

    @Column(name = "games_played", nullable = false)
    private Integer gamesPlayed = 0;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    @PrePersist
    public void onCreate() {
        if (joinedAt == null) {
            joinedAt = Instant.now();
        }
    }

    public UUID getArenaId() {
        return arenaId;
    }

    public void setArenaId(UUID arenaId) {
        this.arenaId = arenaId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public Arena getArena() {
        return arena;
    }

    public User getUser() {
        return user;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
    }

    public Integer getGamesPlayed() {
        return gamesPlayed;
    }

    public void setGamesPlayed(Integer gamesPlayed) {
        this.gamesPlayed = gamesPlayed;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public static class ArenaParticipantId implements Serializable {
        private UUID arenaId;
        private UUID userId;

        public ArenaParticipantId() {}

        public ArenaParticipantId(UUID arenaId, UUID userId) {
            this.arenaId = arenaId;
            this.userId = userId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof ArenaParticipantId that)) return false;
            return Objects.equals(arenaId, that.arenaId) && Objects.equals(userId, that.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(arenaId, userId);
        }
    }
}
