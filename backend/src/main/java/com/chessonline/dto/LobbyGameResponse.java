package com.chessonline.dto;

import java.util.UUID;

public class LobbyGameResponse {
    private UUID id;
    private UUID creatorId;
    private String creatorUsername;
    private int creatorRating;
    private String gameMode;
    private String timeControl;
    private String preferredColor;
    private boolean rated;
    private String createdAt;

    public LobbyGameResponse(UUID id, UUID creatorId, String creatorUsername, int creatorRating, String gameMode,
                              String timeControl, String preferredColor, boolean rated, String createdAt) {
        this.id = id;
        this.creatorId = creatorId;
        this.creatorUsername = creatorUsername;
        this.creatorRating = creatorRating;
        this.gameMode = gameMode;
        this.timeControl = timeControl;
        this.preferredColor = preferredColor;
        this.rated = rated;
        this.createdAt = createdAt;
    }

    // Getters
    public UUID getId() {
        return id;
    }

    public UUID getCreatorId() {
        return creatorId;
    }

    public String getCreatorUsername() {
        return creatorUsername;
    }

    public int getCreatorRating() {
        return creatorRating;
    }

    public String getGameMode() {
        return gameMode;
    }

    public String getTimeControl() {
        return timeControl;
    }

    public String getPreferredColor() {
        return preferredColor;
    }

    public boolean isRated() {
        return rated;
    }

    public String getCreatedAt() {
        return createdAt;
    }
}
