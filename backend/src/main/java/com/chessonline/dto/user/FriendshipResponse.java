package com.chessonline.dto.user;

import java.time.Instant;
import java.util.UUID;

public class FriendshipResponse {
    private UUID id;
    private UserResponse friend;
    private String status;
    private Instant createdAt;

    public FriendshipResponse(UUID id, UserResponse friend, String status, Instant createdAt) {
        this.id = id;
        this.friend = friend;
        this.status = status;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public UserResponse getFriend() {
        return friend;
    }

    public String getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
