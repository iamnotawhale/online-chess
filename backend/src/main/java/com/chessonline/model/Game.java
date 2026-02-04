package com.chessonline.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "games")
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_white_id", nullable = false)
    private User playerWhite;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "player_black_id", nullable = false)
    private User playerBlack;

    @Column(nullable = false, length = 16)
    private String status; // active, finished, abandoned

    @Column(length = 16)
    private String result; // white_win, black_win, draw

    @Column(name = "result_reason", length = 32)
    private String resultReason; // checkmate, resignation, timeout, stalemate, agreement, abandonment

    @Column(name = "time_control", nullable = false, length = 20)
    private String timeControl; // format: "5+3" (minutes+increment in seconds)

    @Column(length = 100)
    private String pgn; // Portable Game Notation

    @Column(name = "fen_final", length = 255)
    private String fenFinal; // Final FEN position

    @Column(name = "fen_current", length = 255)
    private String fenCurrent; // Current FEN position

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invite_id")
    private Invite invite;

    @Column(name = "white_time_left_ms")
    private Long whiteTimeLeftMs; // For time control validation

    @Column(name = "black_time_left_ms")
    private Long blackTimeLeftMs;

    @Column(name = "last_move_at")
    private LocalDateTime lastMoveAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "draw_offered_by_id")
    private User drawOfferedBy;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        status = "active";
    }

    // Constructors
    public Game() {}

    public Game(User playerWhite, User playerBlack, String timeControl, Invite invite) {
        this.playerWhite = playerWhite;
        this.playerBlack = playerBlack;
        this.timeControl = timeControl;
        this.invite = invite;
        this.fenCurrent = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"; // Starting position
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public User getPlayerWhite() {
        return playerWhite;
    }

    public void setPlayerWhite(User playerWhite) {
        this.playerWhite = playerWhite;
    }

    public User getPlayerBlack() {
        return playerBlack;
    }

    public void setPlayerBlack(User playerBlack) {
        this.playerBlack = playerBlack;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public String getResultReason() {
        return resultReason;
    }

    public void setResultReason(String resultReason) {
        this.resultReason = resultReason;
    }

    public String getTimeControl() {
        return timeControl;
    }

    public void setTimeControl(String timeControl) {
        this.timeControl = timeControl;
    }

    public String getPgn() {
        return pgn;
    }

    public void setPgn(String pgn) {
        this.pgn = pgn;
    }

    public String getFenFinal() {
        return fenFinal;
    }

    public void setFenFinal(String fenFinal) {
        this.fenFinal = fenFinal;
    }

    public String getFenCurrent() {
        return fenCurrent;
    }

    public void setFenCurrent(String fenCurrent) {
        this.fenCurrent = fenCurrent;
    }

    public Invite getInvite() {
        return invite;
    }

    public void setInvite(Invite invite) {
        this.invite = invite;
    }

    public Long getWhiteTimeLeftMs() {
        return whiteTimeLeftMs;
    }

    public void setWhiteTimeLeftMs(Long whiteTimeLeftMs) {
        this.whiteTimeLeftMs = whiteTimeLeftMs;
    }

    public Long getBlackTimeLeftMs() {
        return blackTimeLeftMs;
    }

    public void setBlackTimeLeftMs(Long blackTimeLeftMs) {
        this.blackTimeLeftMs = blackTimeLeftMs;
    }

    public LocalDateTime getLastMoveAt() {
        return lastMoveAt;
    }

    public void setLastMoveAt(LocalDateTime lastMoveAt) {
        this.lastMoveAt = lastMoveAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(LocalDateTime finishedAt) {
        this.finishedAt = finishedAt;
    }

    public User getDrawOfferedBy() {
        return drawOfferedBy;
    }

    public void setDrawOfferedBy(User drawOfferedBy) {
        this.drawOfferedBy = drawOfferedBy;
    }

    // Helper methods
    public boolean isActive() {
        return "active".equals(status);
    }

    public boolean isWhiteToMove() {
        // Count moves: if even, white to move; if odd, black to move
        // FEN has space-separated format: position castling en_passant halfmove fullmove
        String[] fenParts = fenCurrent.split(" ");
        return "w".equals(fenParts[1]); // w = white to move, b = black to move
    }

    public boolean isPlayerInGame(UUID userId) {
        return playerWhite.getId().equals(userId) || playerBlack.getId().equals(userId);
    }

    public boolean isPlayerWhite(UUID userId) {
        return playerWhite.getId().equals(userId);
    }
}
