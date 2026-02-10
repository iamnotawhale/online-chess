package com.chessonline.dto;

import java.util.List;

public class AnalysisRequest {
    private String gameId;
    private List<String> moves; // SAN moves
    private String startFen;    // Starting position
    private Integer depth;      // Analysis depth (default 20)

    public AnalysisRequest() {}

    public AnalysisRequest(String gameId, List<String> moves, String startFen, Integer depth) {
        this.gameId = gameId;
        this.moves = moves;
        this.startFen = startFen;
        this.depth = depth;
    }

    public String getGameId() {
        return gameId;
    }

    public void setGameId(String gameId) {
        this.gameId = gameId;
    }

    public List<String> getMoves() {
        return moves;
    }

    public void setMoves(List<String> moves) {
        this.moves = moves;
    }

    public String getStartFen() {
        return startFen;
    }

    public void setStartFen(String startFen) {
        this.startFen = startFen;
    }

    public Integer getDepth() {
        return depth != null ? depth : 20;
    }

    public void setDepth(Integer depth) {
        this.depth = depth;
    }
}
