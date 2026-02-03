package com.chessonline.service;

import com.chessonline.model.*;
import com.chessonline.repository.GameRepository;
import com.chessonline.repository.MoveRepository;
import com.chessonline.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class GameService {

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private MoveRepository moveRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RatingService ratingService;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Create a new game from an invite or matchmaking
     */
    @Transactional
    public Game createGame(UUID whiteId, UUID blackId, String timeControl, Invite invite) {
        User white = userRepository.findById(whiteId)
                .orElseThrow(() -> new RuntimeException("White player not found"));
        User black = userRepository.findById(blackId)
                .orElseThrow(() -> new RuntimeException("Black player not found"));

        if (white.getId().equals(black.getId())) {
            throw new RuntimeException("Cannot play against yourself");
        }

        Game game = new Game(white, black, timeControl, invite);
        
        // Parse time control (e.g., "5+3")
        String[] timeParts = timeControl.split("\\+");
        int minutes = Integer.parseInt(timeParts[0]);
        
        game.setWhiteTimeLeftMs((long) minutes * 60 * 1000);
        game.setBlackTimeLeftMs((long) minutes * 60 * 1000);

        return gameRepository.save(game);
    }

    /**
     * Get game by ID (ensures user is participant)
     */
    @Transactional(readOnly = true)
    public Optional<Game> getGame(UUID gameId, UUID userId) {
        Optional<Game> game = gameRepository.findById(gameId);
        
        if (game.isPresent() && game.get().isPlayerInGame(userId)) {
            return game;
        }
        
        return Optional.empty();
    }

    /**
     * Get game without user check (for public viewing)
     */
    @Transactional(readOnly = true)
    public Optional<Game> getGamePublic(UUID gameId) {
        return gameRepository.findById(gameId);
    }

    /**
     * Make a move in the game (simplified validation - stores move without full chess validation)
     */
    @Transactional
    public Move makeMove(UUID gameId, UUID userId, String moveStr) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (!game.isActive()) {
            throw new RuntimeException("Game is not active");
        }

        if (!game.isPlayerInGame(userId)) {
            throw new RuntimeException("User is not in this game");
        }

        // Check if it's player's turn
        boolean isWhiteToMove = game.isWhiteToMove();
        boolean isWhitePlayer = game.isPlayerWhite(userId);
        
        if (isWhiteToMove != isWhitePlayer) {
            throw new RuntimeException("It's not your turn");
        }

        // Validate move format (basic validation)
        validateMoveFormat(moveStr);

        // Create move record
        List<Move> moves = moveRepository.findByGameIdOrderByMoveNumber(gameId);
        int moveNumber = moves.size() + 1;

        // Simple FEN update (flip turn)
        String currentFen = game.getFenCurrent();
        String newFen = flipFenTurn(currentFen);

        Move moveRecord = new Move(game, moveNumber, moveStr, newFen);
        moveRecord = moveRepository.save(moveRecord);

        // Update game FEN
        game.setFenCurrent(newFen);
        
        // TODO: Implement proper checkmate/stalemate detection here
        // For now, games continue until resignation/abandon
        
        Game savedGame = gameRepository.save(game);
        
        // Send WebSocket notification
        notifyGameUpdate(savedGame);

        return moveRecord;
    }
    
    /**
     * Send WebSocket notification about game update
     */
    private void notifyGameUpdate(Game game) {
        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSend(
                    "/topic/game/" + game.getId() + "/updates",
                    createGameUpdateMessage(game)
                );
            } catch (Exception e) {
                // Log error but don't fail the request
                System.err.println("Failed to send WebSocket notification: " + e.getMessage());
            }
        }
    }
    
    private GameUpdateMessage createGameUpdateMessage(Game game) {
        GameUpdateMessage msg = new GameUpdateMessage();
        msg.setGameId(game.getId());
        msg.setStatus(game.getStatus());
        msg.setFenCurrent(game.getFenCurrent());
        msg.setResult(game.getResult());
        msg.setResultReason(game.getResultReason());
        msg.setWhiteTimeLeftMs(game.getWhiteTimeLeftMs());
        msg.setBlackTimeLeftMs(game.getBlackTimeLeftMs());
        return msg;
    }
    
    // Inner class for WebSocket messages
    public static class GameUpdateMessage {
        private UUID gameId;
        private String status;
        private String fenCurrent;
        private String result;
        private String resultReason;
        private Long whiteTimeLeftMs;
        private Long blackTimeLeftMs;
        
        public UUID getGameId() { return gameId; }
        public void setGameId(UUID gameId) { this.gameId = gameId; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String getFenCurrent() { return fenCurrent; }
        public void setFenCurrent(String fenCurrent) { this.fenCurrent = fenCurrent; }
        public String getResult() { return result; }
        public void setResult(String result) { this.result = result; }
        public String getResultReason() { return resultReason; }
        public void setResultReason(String resultReason) { this.resultReason = resultReason; }
        public Long getWhiteTimeLeftMs() { return whiteTimeLeftMs; }
        public void setWhiteTimeLeftMs(Long whiteTimeLeftMs) { this.whiteTimeLeftMs = whiteTimeLeftMs; }
        public Long getBlackTimeLeftMs() { return blackTimeLeftMs; }
        public void setBlackTimeLeftMs(Long blackTimeLeftMs) { this.blackTimeLeftMs = blackTimeLeftMs; }
    }

    /**
     * Basic move format validation (algebraic notation)
     */
    private void validateMoveFormat(String move) {
        // Allow castling, captures, promotions, checks: O-O, e4, Nf3, exd5, e8=Q, Bf5+, etc.
        if (!move.matches("^([a-h][1-8]|[a-h]x[a-h][1-8]|[NBRQK][a-h0-8]?x?[a-h][1-8]|O-O(?:-O)?|[a-h]8=[NBRQK]|.+[+#]?)$")) {
            throw new RuntimeException("Invalid move format: " + move);
        }
    }

    /**
     * Simple FEN turn flip (w -> b, b -> w)
     */
    private String flipFenTurn(String fen) {
        String[] parts = fen.split(" ");
        if (parts.length > 1) {
            parts[1] = "w".equals(parts[1]) ? "b" : "w";
            return String.join(" ", parts);
        }
        return fen;
    }

    /**
     * Resign from game
     */
    @Transactional
    public Game resign(UUID gameId, UUID userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (!game.isActive()) {
            throw new RuntimeException("Game is not active");
        }

        if (!game.isPlayerInGame(userId)) {
            throw new RuntimeException("User is not in this game");
        }

        game.setStatus("finished");
        game.setFinishedAt(LocalDateTime.now());

        if (game.isPlayerWhite(userId)) {
            game.setResult("black_win");
        } else {
            game.setResult("white_win");
        }
        game.setResultReason("resignation");

        Game savedGame = gameRepository.save(game);
        
        // Update ratings
        ratingService.updateRatingsForGame(savedGame);
        
        // Send WebSocket notification
        notifyGameUpdate(savedGame);
        
        return savedGame;
    }

    /**
     * Abandon game (if inactive for too long)
     */
    @Transactional
    public Game abandon(UUID gameId, UUID userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (!game.isActive()) {
            throw new RuntimeException("Game is not active");
        }

        if (!game.isPlayerInGame(userId)) {
            throw new RuntimeException("User is not in this game");
        }

        game.setStatus("abandoned");
        game.setFinishedAt(LocalDateTime.now());
        game.setResultReason("abandonment");

        return gameRepository.save(game);
    }

    /**
     * Get move history for a game
     */
    @Transactional(readOnly = true)
    public List<Move> getGameMoves(UUID gameId) {
        return moveRepository.findByGameIdOrderByMoveNumber(gameId);
    }

    /**
     * Get games for a user (active and finished)
     */
    @Transactional(readOnly = true)
    public List<Game> getUserGames(UUID userId) {
        return gameRepository.findByPlayerWhiteIdOrPlayerBlackIdOrderByCreatedAtDesc(userId, userId);
    }

    /**
     * Get active games for a user
     */
    @Transactional(readOnly = true)
    public List<Game> getUserActiveGames(UUID userId) {
        return gameRepository.findByStatusAndPlayerWhiteIdOrPlayerBlackId("active", userId, userId);
    }

    /**
     * Generate PGN for a game
     */
    @Transactional(readOnly = true)
    public String generatePGN(UUID gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        List<Move> moves = getGameMoves(gameId);

        StringBuilder pgn = new StringBuilder();
        pgn.append("[Event \"Online Chess\"]\n");
        pgn.append("[Site \"chessonline.app\"]\n");
        pgn.append("[Date \"").append(game.getCreatedAt().toLocalDate()).append("\"]\n");
        pgn.append("[White \"").append(game.getPlayerWhite().getUsername()).append("\"]\n");
        pgn.append("[Black \"").append(game.getPlayerBlack().getUsername()).append("\"]\n");
        pgn.append("[TimeControl \"").append(game.getTimeControl()).append("\"]\n");

        if (game.getResult() != null) {
            String result = "1/2-1/2";
            if ("white_win".equals(game.getResult())) {
                result = "1-0";
            } else if ("black_win".equals(game.getResult())) {
                result = "0-1";
            }
            pgn.append("[Result \"").append(result).append("\"]\n");
        }

        pgn.append("\n");

        // Add moves
        for (int i = 0; i < moves.size(); i++) {
            if (i % 2 == 0) {
                pgn.append((i / 2) + 1).append(". ");
            }
            pgn.append(moves.get(i).getSan()).append(" ");
        }

        if (game.getResult() != null) {
            String result = "1/2-1/2";
            if ("white_win".equals(game.getResult())) {
                result = "1-0";
            } else if ("black_win".equals(game.getResult())) {
                result = "0-1";
            }
            pgn.append(result);
        }

        return pgn.toString();
    }
}
