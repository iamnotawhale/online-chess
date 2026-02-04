package com.chessonline.service;

import com.chessonline.model.*;
import com.chessonline.repository.GameRepository;
import com.chessonline.repository.MoveRepository;
import com.chessonline.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
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
        game.setLastMoveAt(LocalDateTime.now());

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

        // Update clocks before move
        if (updateClocksOnMove(game, isWhiteToMove)) {
            Game savedTimeoutGame = gameRepository.save(game);
            ratingService.updateRatingsForGame(savedTimeoutGame);
            notifyGameUpdate(savedTimeoutGame);
            throw new RuntimeException("Time out");
        }

        // Create move record
        List<Move> moves = moveRepository.findByGameIdOrderByMoveNumber(gameId);
        int moveNumber = moves.size() + 1;

        // Apply move to FEN string
        String newFen;
        try {
            newFen = applyMoveToFen(game.getFenCurrent(), moveStr);
        } catch (Exception e) {
            throw new RuntimeException("Invalid move: " + e.getMessage());
        }

        Move moveRecord = new Move(game, moveNumber, moveStr, newFen);
        moveRecord = moveRepository.save(moveRecord);

        // Update game FEN
        game.setFenCurrent(newFen);

        // Update last move timestamp
        game.setLastMoveAt(LocalDateTime.now());
        
        // Check for checkmate or stalemate
        GameEndState endState = checkGameEnd(newFen);
        if (endState != GameEndState.ONGOING) {
            game.setStatus("completed");
            if (endState == GameEndState.CHECKMATE) {
                // The player who just moved wins (turn in newFen is now the loser's turn)
                String[] fenParts = newFen.split(" ");
                String currentTurn = fenParts.length > 1 ? fenParts[1] : "w";
                // If current turn is white, black just won (and vice versa)
                game.setResult(currentTurn.equals("w") ? "0-1" : "1-0");
                game.setResultReason("checkmate");
                System.out.println("♔ Checkmate! Winner: " + (currentTurn.equals("w") ? "Black" : "White"));
            } else if (endState == GameEndState.STALEMATE) {
                game.setResult("1/2-1/2");
                game.setResultReason("stalemate");
                System.out.println("♔ Stalemate! Draw.");
            }
        }
        
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
                GameUpdateMessage msg = createGameUpdateMessage(game);
                String topic = "/topic/game/" + game.getId() + "/updates";
                System.out.println("📤 Sending game update to " + topic + " - FEN: " + msg.getFenCurrent());
                messagingTemplate.convertAndSend(topic, msg);
            } catch (Exception e) {
                // Log error but don't fail the request
                System.err.println("Failed to send WebSocket notification: " + e.getMessage());
            }
        }
    }

    private void sendClockTick(Game game) {
        if (messagingTemplate == null) {
            return;
        }
        try {
            messagingTemplate.convertAndSend(
                "/topic/game/" + game.getId() + "/updates",
                createGameUpdateMessage(game)
            );
        } catch (Exception e) {
            System.err.println("Failed to send clock tick: " + e.getMessage());
        }
    }
    
    private GameUpdateMessage createGameUpdateMessage(Game game) {
        GameUpdateMessage msg = new GameUpdateMessage();
        msg.setGameId(game.getId());
        msg.setStatus(game.getStatus());
        msg.setFenCurrent(game.getFenCurrent());
        msg.setResult(game.getResult());
        msg.setResultReason(game.getResultReason());
        msg.setWhiteTimeLeftMs(getEffectiveTimeLeftMs(game, true));
        msg.setBlackTimeLeftMs(getEffectiveTimeLeftMs(game, false));
        msg.setLastMoveAt(game.getLastMoveAt());
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
        private LocalDateTime lastMoveAt;
        
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
        public LocalDateTime getLastMoveAt() { return lastMoveAt; }
        public void setLastMoveAt(LocalDateTime lastMoveAt) { this.lastMoveAt = lastMoveAt; }
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

    private boolean updateClocksOnMove(Game game, boolean isWhiteToMove) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastMoveAt = game.getLastMoveAt();

        if (lastMoveAt == null) {
            game.setLastMoveAt(now);
            return false;
        }

        long elapsedMs = Duration.between(lastMoveAt, now).toMillis();
        long incrementMs = parseIncrementMs(game.getTimeControl());

        if (isWhiteToMove) {
            long remaining = safeTimeLeft(game.getWhiteTimeLeftMs()) - elapsedMs;
            if (remaining <= 0) {
                game.setWhiteTimeLeftMs(0L);
                finishGameOnTimeout(game, true);
                return true;
            }
            game.setWhiteTimeLeftMs(remaining + incrementMs);
        } else {
            long remaining = safeTimeLeft(game.getBlackTimeLeftMs()) - elapsedMs;
            if (remaining <= 0) {
                game.setBlackTimeLeftMs(0L);
                finishGameOnTimeout(game, false);
                return true;
            }
            game.setBlackTimeLeftMs(remaining + incrementMs);
        }

        return false;
    }

    private long parseIncrementMs(String timeControl) {
        if (timeControl == null || !timeControl.contains("+")) {
            return 0L;
        }
        String[] parts = timeControl.split("\\+");
        if (parts.length < 2) {
            return 0L;
        }
        try {
            int incrementSeconds = Integer.parseInt(parts[1]);
            return incrementSeconds * 1000L;
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private long safeTimeLeft(Long value) {
        return value == null ? 0L : value;
    }

    private void finishGameOnTimeout(Game game, boolean whiteTimedOut) {
        game.setStatus("finished");
        game.setResult(whiteTimedOut ? "black_win" : "white_win");
        game.setResultReason("timeout");
        game.setFinishedAt(LocalDateTime.now());
        game.setFenFinal(game.getFenCurrent());
    }

    public long getEffectiveTimeLeftMs(Game game, boolean whiteSide) {
        if (game == null) {
            return 0L;
        }
        long base = whiteSide ? safeTimeLeft(game.getWhiteTimeLeftMs()) : safeTimeLeft(game.getBlackTimeLeftMs());
        if (!game.isActive() || game.getLastMoveAt() == null) {
            return base;
        }
        boolean isWhiteToMove = game.isWhiteToMove();
        if (whiteSide != isWhiteToMove) {
            return base;
        }
        long elapsedMs = Duration.between(game.getLastMoveAt(), LocalDateTime.now()).toMillis();
        return Math.max(base - elapsedMs, 0L);
    }

    @Scheduled(fixedRate = 1000)
    @Transactional
    public void checkGameTimeouts() {
        List<Game> activeGames = gameRepository.findByStatus("active");
        if (activeGames.isEmpty()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        for (Game game : activeGames) {
            if (game.getLastMoveAt() == null) {
                game.setLastMoveAt(now);
                gameRepository.save(game);
                continue;
            }

            boolean whiteToMove = game.isWhiteToMove();
            long base = whiteToMove ? safeTimeLeft(game.getWhiteTimeLeftMs()) : safeTimeLeft(game.getBlackTimeLeftMs());
            long elapsedMs = Duration.between(game.getLastMoveAt(), now).toMillis();
            long remaining = base - elapsedMs;

            if (remaining <= 0) {
                if (whiteToMove) {
                    game.setWhiteTimeLeftMs(0L);
                } else {
                    game.setBlackTimeLeftMs(0L);
                }
                finishGameOnTimeout(game, whiteToMove);
                Game savedGame = gameRepository.save(game);
                ratingService.updateRatingsForGame(savedGame);
                notifyGameUpdate(savedGame);
                continue;
            }

            sendClockTick(game);
        }
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
     * Offer draw
     */
    @Transactional
    public void offerDraw(UUID gameId, UUID userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (!game.isActive()) {
            throw new RuntimeException("Game is not active");
        }

        if (!game.isPlayerInGame(userId)) {
            throw new RuntimeException("User is not in this game");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        game.setDrawOfferedBy(user);
        gameRepository.save(game);

        // Notify opponent via WebSocket
        notifyGameUpdate(game);
    }

    /**
     * Respond to draw offer
     */
    @Transactional
    public void respondToDraw(UUID gameId, UUID userId, boolean accept) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (!game.isActive()) {
            throw new RuntimeException("Game is not active");
        }

        if (!game.isPlayerInGame(userId)) {
            throw new RuntimeException("User is not in this game");
        }

        if (game.getDrawOfferedBy() == null) {
            throw new RuntimeException("No draw offer pending");
        }

        if (game.getDrawOfferedBy().getId().equals(userId)) {
            throw new RuntimeException("Cannot respond to your own draw offer");
        }

        if (accept) {
            // Accept draw
            game.setStatus("finished");
            game.setFinishedAt(LocalDateTime.now());
            game.setResult("draw");
            game.setResultReason("agreement");
            game.setDrawOfferedBy(null);
            
            Game savedGame = gameRepository.save(game);
            
            // Update ratings
            ratingService.updateRatingsForGame(savedGame);
            
            // Notify via WebSocket
            notifyGameUpdate(savedGame);
        } else {
            // Decline draw
            game.setDrawOfferedBy(null);
            gameRepository.save(game);
            
            // Notify via WebSocket
            notifyGameUpdate(game);
        }
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
     * Get finished games for a user
     */
    @Transactional(readOnly = true)
    public List<Game> getUserFinishedGames(UUID userId) {
        return gameRepository.findFinishedGamesByUserId("finished", userId);
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

    /**
     * Enum for game end states
     */
    private enum GameEndState {
        ONGOING, CHECKMATE, STALEMATE
    }

    /**
     * Check if the game has ended (checkmate or stalemate)
     */
    private GameEndState checkGameEnd(String fen) {
        String[] parts = fen.split(" ");
        String turn = parts.length > 1 ? parts[1] : "w";
        
        // Check if the current player (whose turn it is) has any legal moves
        boolean hasLegalMoves = hasAnyLegalMove(fen);
        
        if (!hasLegalMoves) {
            // If no legal moves, check if in check
            boolean inCheck = isInCheck(fen, turn);
            if (inCheck) {
                return GameEndState.CHECKMATE;
            } else {
                return GameEndState.STALEMATE;
            }
        }
        
        return GameEndState.ONGOING;
    }

    /**
     * Check if current player has any legal move
     */
    private boolean hasAnyLegalMove(String fen) {
        String[] parts = fen.split(" ");
        String boardPart = parts[0];
        String turn = parts.length > 1 ? parts[1] : "w";
        
        // Parse board
        String[][] board = parseFenBoard(boardPart);
        
        // Try all possible moves for all pieces of current color
        for (int fromRank = 0; fromRank < 8; fromRank++) {
            for (int fromFile = 0; fromFile < 8; fromFile++) {
                String piece = board[fromRank][fromFile];
                if (piece.equals(" ")) continue;
                
                // Check if piece belongs to current player
                boolean isPieceWhite = Character.isUpperCase(piece.charAt(0));
                boolean isPlayerWhite = turn.equals("w");
                if (isPieceWhite != isPlayerWhite) continue;
                
                // Try all possible destination squares
                for (int toRank = 0; toRank < 8; toRank++) {
                    for (int toFile = 0; toFile < 8; toFile++) {
                        if (fromRank == toRank && fromFile == toFile) continue;
                        
                        // Try to make this move
                        try {
                            String fromSquare = fileRankToSquare(fromFile, fromRank);
                            String toSquare = fileRankToSquare(toFile, toRank);
                            String testMove = fromSquare + toSquare;
                            
                            // Try applying the move (will throw if invalid)
                            String newFen = applyMoveToFen(fen, testMove);
                            
                            // Check if this move leaves king in check
                            if (!isInCheck(newFen, turn)) {
                                return true; // Found a legal move
                            }
                        } catch (Exception e) {
                            // Invalid move, continue
                        }
                    }
                }
            }
        }
        
        return false; // No legal moves found
    }

    /**
     * Check if the given side is in check
     */
    private boolean isInCheck(String fen, String side) {
        String[] parts = fen.split(" ");
        String boardPart = parts[0];
        String[][] board = parseFenBoard(boardPart);
        
        // Find king position
        String kingPiece = side.equals("w") ? "K" : "k";
        int kingRank = -1, kingFile = -1;
        
        for (int r = 0; r < 8; r++) {
            for (int f = 0; f < 8; f++) {
                if (board[r][f].equals(kingPiece)) {
                    kingRank = r;
                    kingFile = f;
                    break;
                }
            }
            if (kingRank != -1) break;
        }
        
        if (kingRank == -1) {
            return false; // King not found (shouldn't happen)
        }
        
        // Check if any opponent piece can attack the king
        boolean opponentIsWhite = !side.equals("w");
        
        for (int r = 0; r < 8; r++) {
            for (int f = 0; f < 8; f++) {
                String piece = board[r][f];
                if (piece.equals(" ")) continue;
                
                boolean isPieceWhite = Character.isUpperCase(piece.charAt(0));
                if (isPieceWhite != opponentIsWhite) continue;
                
                // Check if this piece can attack the king
                if (canPieceAttackSquare(board, piece.toUpperCase().charAt(0), r, f, kingRank, kingFile)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Check if a piece at (fromR, fromF) can attack square (toR, toF)
     */
    private boolean canPieceAttackSquare(String[][] board, char pieceType, int fromR, int fromF, int toR, int toF) {
        int dr = toR - fromR;
        int df = toF - fromF;
        
        switch (pieceType) {
            case 'P': // Pawn (only attacks diagonally)
                return Math.abs(df) == 1 && Math.abs(dr) == 1;
            case 'N': // Knight
                return (Math.abs(dr) == 2 && Math.abs(df) == 1) || (Math.abs(dr) == 1 && Math.abs(df) == 2);
            case 'B': // Bishop
                if (Math.abs(dr) != Math.abs(df)) return false;
                return isPathClear(board, fromR, fromF, toR, toF);
            case 'R': // Rook
                if (dr != 0 && df != 0) return false;
                return isPathClear(board, fromR, fromF, toR, toF);
            case 'Q': // Queen
                if (dr != 0 && df != 0 && Math.abs(dr) != Math.abs(df)) return false;
                return isPathClear(board, fromR, fromF, toR, toF);
            case 'K': // King
                return Math.abs(dr) <= 1 && Math.abs(df) <= 1;
        }
        return false;
    }

    /**
     * Check if path is clear between two squares
     */
    private boolean isPathClear(String[][] board, int fromR, int fromF, int toR, int toF) {
        int dr = Integer.compare(toR - fromR, 0);
        int df = Integer.compare(toF - fromF, 0);
        
        int r = fromR + dr;
        int f = fromF + df;
        
        while (r != toR || f != toF) {
            if (!board[r][f].equals(" ")) {
                return false;
            }
            r += dr;
            f += df;
        }
        
        return true;
    }

    /**
     * Parse FEN board part into 2D array
     */
    private String[][] parseFenBoard(String boardPart) {
        String[][] board = new String[8][8];
        String[] ranks = boardPart.split("/");
        
        for (int r = 0; r < 8 && r < ranks.length; r++) {
            String rank = ranks[r];
            int f = 0;
            for (int i = 0; i < rank.length() && f < 8; i++) {
                char c = rank.charAt(i);
                if (Character.isDigit(c)) {
                    int emptyCount = Character.getNumericValue(c);
                    for (int j = 0; j < emptyCount && f < 8; j++) {
                        board[r][f++] = " ";
                    }
                } else {
                    board[r][f++] = String.valueOf(c);
                }
            }
            // Fill remaining squares with empty
            while (f < 8) {
                board[r][f++] = " ";
            }
        }
        
        return board;
    }

    /**
     * Convert file and rank indices to algebraic notation
     */
    private String fileRankToSquare(int file, int rank) {
        char fileChar = (char) ('a' + file);
        char rankChar = (char) ('1' + (7 - rank));
        return "" + fileChar + rankChar;
    }

    /**
     * Apply a coordinate move (e.g., "e2e4") to a FEN string
     * This is a simplified implementation that moves pieces without full chess rule validation
     */
    private String applyMoveToFen(String fen, String move) {
        if (move.length() < 4) {
            throw new RuntimeException("Move must be at least 4 characters (e.g., 'e2e4')");
        }

        String[] fenParts = fen.split(" ");
        String boardPart = fenParts[0];
        String turn = fenParts.length > 1 ? fenParts[1] : "w";
        String castling = fenParts.length > 2 ? fenParts[2] : "KQkq";
        String enPassant = fenParts.length > 3 ? fenParts[3] : "-";
        String halfmove = fenParts.length > 4 ? fenParts[4] : "0";
        String fullmove = fenParts.length > 5 ? fenParts[5] : "1";

        // Parse move
        String from = move.substring(0, 2);
        String to = move.substring(2, 4);
        String promotion = move.length() > 4 ? move.substring(4, 5) : null;

        // Convert to coordinates
        int fromFile = from.charAt(0) - 'a';
        int fromRank = 8 - (from.charAt(1) - '0');
        int toFile = to.charAt(0) - 'a';
        int toRank = 8 - (to.charAt(1) - '0');

        // Convert board to 2D array
        String[][] board = new String[8][8];
        String[] ranks = boardPart.split("/");
        for (int r = 0; r < 8; r++) {
            int file = 0;
            for (char c : ranks[r].toCharArray()) {
                if (Character.isDigit(c)) {
                    int empty = c - '0';
                    for (int i = 0; i < empty; i++) {
                        board[r][file++] = " ";
                    }
                } else {
                    board[r][file++] = String.valueOf(c);
                }
            }
        }

        // Apply move
        String piece = board[fromRank][fromFile];
        board[toRank][toFile] = piece;
        board[fromRank][fromFile] = " ";

        // Handle castling (when king moves 2 squares)
        if ((piece.equals("K") || piece.equals("k")) && Math.abs(toFile - fromFile) == 2) {
            // This is castling - need to move the rook too
            if (toFile > fromFile) {
                // Kingside castling (short) - rook from h-file to f-file
                int rookFromFile = 7; // h-file
                int rookToFile = 5;   // f-file
                String rook = board[fromRank][rookFromFile];
                board[fromRank][rookToFile] = rook;
                board[fromRank][rookFromFile] = " ";
            } else {
                // Queenside castling (long) - rook from a-file to d-file
                int rookFromFile = 0; // a-file
                int rookToFile = 3;   // d-file
                String rook = board[fromRank][rookFromFile];
                board[fromRank][rookToFile] = rook;
                board[fromRank][rookFromFile] = " ";
            }
        }

        // Handle promotion
        if (promotion != null && !promotion.isEmpty()) {
            String promoPiece = promotion;
            if (turn.equals("w")) {
                promoPiece = promoPiece.toUpperCase();
            }
            board[toRank][toFile] = promoPiece;
        }

        // Convert back to FEN board part
        StringBuilder newBoardPart = new StringBuilder();
        for (int r = 0; r < 8; r++) {
            int emptyCount = 0;
            for (int f = 0; f < 8; f++) {
                if (board[r][f].equals(" ")) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        newBoardPart.append(emptyCount);
                        emptyCount = 0;
                    }
                    newBoardPart.append(board[r][f]);
                }
            }
            if (emptyCount > 0) {
                newBoardPart.append(emptyCount);
            }
            if (r < 7) {
                newBoardPart.append("/");
            }
        }

        // Flip turn
        String newTurn = turn.equals("w") ? "b" : "w";

        // Increment fullmove if black just moved
        int newFullmove = Integer.parseInt(fullmove);
        if (turn.equals("b")) {
            newFullmove++;
        }

        // Return new FEN
        return newBoardPart + " " + newTurn + " " + castling + " " + enPassant + " " + halfmove + " " + newFullmove;
    }
}
