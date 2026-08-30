package com.chessonline.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "user_ratings")
@IdClass(UserRating.UserRatingId.class)
public class UserRating {

    @Id
    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Id
    @Column(length = 20, nullable = false)
    private String category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", insertable = false, updatable = false)
    private User user;

    @Column(nullable = false)
    private Integer rating = 1200;

    @Column(name = "games_played", nullable = false)
    private Integer gamesPlayed = 0;

    public UserRating() {}

    public UserRating(UUID userId, String category, Integer rating, Integer gamesPlayed) {
        this.userId = userId;
        this.category = category;
        this.rating = rating;
        this.gamesPlayed = gamesPlayed;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public User getUser() {
        return user;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public Integer getGamesPlayed() {
        return gamesPlayed;
    }

    public void setGamesPlayed(Integer gamesPlayed) {
        this.gamesPlayed = gamesPlayed;
    }

    public static class UserRatingId implements Serializable {
        private UUID userId;
        private String category;

        public UserRatingId() {}

        public UserRatingId(UUID userId, String category) {
            this.userId = userId;
            this.category = category;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof UserRatingId that)) return false;
            return Objects.equals(userId, that.userId) && Objects.equals(category, that.category);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, category);
        }
    }
}
