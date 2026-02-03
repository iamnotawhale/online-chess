package com.chessonline.dto.user;

import java.time.Instant;
import java.util.UUID;

public class UserResponse {

    private UUID id;
    private String username;
    private String email;
    private Integer rating;
    private String country;
    private String bio;
    private String avatarUrl;
    private Instant createdAt;
    private UserStatsResponse stats;

    public UserResponse(UUID id, String username, String email, Integer rating, String country,
                        String bio, String avatarUrl, Instant createdAt, UserStatsResponse stats) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.rating = rating;
        this.country = country;
        this.bio = bio;
        this.avatarUrl = avatarUrl;
        this.createdAt = createdAt;
        this.stats = stats;
    }

    public UUID getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getEmail() {
        return email;
    }

    public Integer getRating() {
        return rating;
    }

    public String getCountry() {
        return country;
    }

    public String getBio() {
        return bio;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public UserStatsResponse getStats() {
        return stats;
    }
}
