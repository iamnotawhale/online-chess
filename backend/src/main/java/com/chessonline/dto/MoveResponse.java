package com.chessonline.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class MoveResponse {
    private UUID id;
    private Integer moveNumber;
    private String san;
    private String fen;
    private Integer timeLeftMs;
    private LocalDateTime createdAt;

    public MoveResponse() {}

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
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
