package com.chessonline.service;

import com.chessonline.model.*;
import com.chessonline.repository.GameRepository;
import com.chessonline.repository.LobbyGameRepository;
import com.chessonline.repository.MoveRepository;
import com.chessonline.repository.UserRepository;
import com.github.bhlangonijr.chesslib.Board;
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

    @Autowired
    private ArenaService arenaService;

    @Autowired
    private LobbyGameRepository lobbyGameRepository;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Create a new game from an invite or matchmaking
     */
    @Transactional
    public Game createGame(UUID whiteId, UUID blackId, String timeControl, Invite invite, boolean rated) {
        User white = userRepository.findById(whiteId)
                .orElseThrow(() -> new RuntimeException("White player not found"));
        User black = userRepository.findById(blackId)
                .orElseThrow(() -> new RuntimeException("Black player not found"));

        if (white.getId().equals(black.getId())) {
            throw new RuntimeException("Cannot play against yourself");
        }

        Game game = new Game(white, black, timeControl, invite, rated);
        
        // Parse time control (e.g., "5+3")
        String[] timeParts = timeControl.split("\\+");
        int minutes = Integer.parseInt(timeParts[0]);
        
        game.setWhiteTimeLeftMs((long) minutes * 60 * 1000);
        game.setBlackTimeLeftMs((long) minutes * 60 * 1000);
        // Don't set lastMoveAt - timer starts only after first move (chess rule)
        // game.setLastMoveAt will be set in updateClocksOnMove on first move

        Game savedGame = gameRepository.save(game);
        
        // Notify both players that game has started via WebSocket
        if (messagingTemplate != null) {
            java.util.Map<String, Object> gameStartedMessage = java.util.Map.of(
                "gameId", savedGame.getId(),
                "message", "Game started"
            );
            
            // Send to white player
            messagingTemplate.convertAndSendToUser(
                    white.getId().toString(),
                    "/queue/game-started",
                    gameStartedMessage
            );
            
            // Send to black player
            messagingTemplate.convertAndSendToUser(
                    black.getId().toString(),
                    "/queue/game-started",
                    gameStartedMessage
            );
        }
        
        return savedGame;
    }

    /**
     * Get game by ID (public for finished and active games)
     */
    @Transactional(readOnly = true)
    public Optional<Game> getGame(String gameId, UUID userId) {
        Optional<Game> game = gameRepository.findById(gameId);

        if (game.isPresent()) {
            Game g = game.get();
            if (g.isPlayerInGame(userId)) {
                return game;
            }

            String status = g.getStatus();
            if (status != null && (status.equals("finished") || status.equals("active"))) {
                return game;
            }
        }

        return Optional.empty();
    }

    /**
     * Get game without user check (for public viewing)
     */
    @Transactional(readOnly = true)
    public Optional<Game> getGamePublic(String gameId) {
        return gameRepository.findById(gameId);
    }

    /**
     * Make a move in the game using chesslib for validation
     */
    @Transactional
    public Move makeMove(String gameId, UUID userId, String moveStr) {
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

        // Update clocks before move
        if (updateClocksOnMove(game, isWhiteToMove)) {
            Game savedTimeoutGame = gameRepository.save(game);
            onGameFinished(savedTimeoutGame);
            notifyGameUpdate(savedTimeoutGame);
            throw new RuntimeException("Time out");
        }

        // Use chesslib to validate and apply move
        String newFen;
        try {
            Board board = new Board();
            board.loadFromFen(game.getFenCurrent());
            
            // Parse UCI move (e.g., "e2e4")
            com.github.bhlangonijr.chesslib.move.Move chesslibMove = new com.github.bhlangonijr.chesslib.move.Move(moveStr, board.getSideToMove());
            
            // Validate and apply move
            if (!board.legalMoves().contains(chesslibMove)) {
                throw new RuntimeException("Illegal move: " + moveStr);
            }
            
            board.doMove(chesslibMove);
            newFen = board.getFen();
            
            System.out.println("✅ Move applied: " + moveStr + " -> New FEN: " + newFen);
        } catch (Exception e) {
            System.err.println("❌ Invalid move: " + moveStr + " - " + e.getMessage());
            throw new RuntimeException("Invalid move: " + e.getMessage());
        }

        // Create move record
        List<Move> moves = moveRepository.findByGameIdOrderByMoveNumber(gameId);
        int moveNumber = moves.size() + 1;

        Move moveRecord = new Move(game, moveNumber, moveStr, newFen);
        moveRecord = moveRepository.save(moveRecord);

        // Update game FEN
        game.setFenCurrent(newFen);

        // Update last move timestamp
        game.setLastMoveAt(LocalDateTime.now());
        
        // Check for checkmate or stalemate using chesslib
        GameEndState endState = checkGameEndWithChesslib(newFen);
        System.out.println("🔍 Game end check for FEN: " + newFen + " -> State: " + endState);
        if (endState != GameEndState.ONGOING) {
            game.setStatus("finished");
            game.setFinishedAt(LocalDateTime.now());
            if (endState == GameEndState.CHECKMATE) {
                // The player who just moved wins (turn in newFen is now the loser's turn)
                String[] fenParts = newFen.split(" ");
                String currentTurn = fenParts.length > 1 ? fenParts[1] : "w";
                // If current turn is white, black just won (and vice versa)
                game.setResult(currentTurn.equals("w") ? "0-1" : "1-0");
                game.setResultReason("checkmate");
                System.out.println("♔ CHECKMATE! Winner: " + (currentTurn.equals("w") ? "Black" : "White") + " | Result: " + game.getResult());
            } else if (endState == GameEndState.STALEMATE) {
                game.setResult("1/2-1/2");
                game.setResultReason("stalemate");
                System.out.println("♔ STALEMATE! Draw.");
            }
        }
        
        Game savedGame = gameRepository.save(game);
        
        // Update ratings if game finished
        if ("finished".equals(savedGame.getStatus())) {
            onGameFinished(savedGame);
        }
        
        // Send WebSocket notification
        notifyGameUpdate(savedGame);

        return moveRecord;
    }

    private void onGameFinished(Game game) {
        ratingService.updateRatingsForGame(game);
        removeLobbyGameByPlayers(game.getPlayerWhite().getId(), game.getPlayerBlack().getId());
        arenaService.updateScoresOnGameFinish(game);
    }

    private void onGameFinishedWithoutRating(Game game) {
        removeLobbyGameByPlayers(game.getPlayerWhite().getId(), game.getPlayerBlack().getId());
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
    
    /**
     * Get half-move count from FEN (number of half-moves played)
     */
    private int getHalfMoveCount(String fen) {
        if (fen == null || fen.isEmpty()) {
            return 0;
        }
        String[] parts = fen.split(" ");
        if (parts.length < 6) {
            return 0;
        }
        
        // parts[1] = active color (w/b)
        // parts[5] = fullmove number (starts at 1)
        try {
            int fullMoveNumber = Integer.parseInt(parts[5]);
            boolean isWhiteToMove = "w".equals(parts[1]);
            
            // Calculate half-moves: (fullMoveNumber - 1) * 2 + (isWhiteToMove ? 0 : 1)
            // fullMoveNumber=1, white to move = 0 half-moves (start position)
            // fullMoveNumber=1, black to move = 1 half-move (white moved)
            // fullMoveNumber=2, white to move = 2 half-moves (white & black moved)
            return (fullMoveNumber - 1) * 2 + (isWhiteToMove ? 0 : 1);
        } catch (NumberFormatException e) {
            return 0;
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
        msg.setDrawOfferedById(game.getDrawOfferedBy() != null ? game.getDrawOfferedBy().getId() : null);
        msg.setTakebackOfferedById(game.getTakebackOfferedBy() != null ? game.getTakebackOfferedBy().getId() : null);
        return msg;
    }
    
    // Inner class for WebSocket messages
    public static class GameUpdateMessage {
        private String gameId;
        private String status;
        private String fenCurrent;
        private String result;
        private String resultReason;
        private Long whiteTimeLeftMs;
        private Long blackTimeLeftMs;
        private LocalDateTime lastMoveAt;
        private UUID drawOfferedById;
        private UUID takebackOfferedById;
        
        public String getGameId() { return gameId; }
        public void setGameId(String gameId) { this.gameId = gameId; }
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
        public UUID getDrawOfferedById() { return drawOfferedById; }
        public void setDrawOfferedById(UUID drawOfferedById) { this.drawOfferedById = drawOfferedById; }
        public UUID getTakebackOfferedById() { return takebackOfferedById; }
        public void setTakebackOfferedById(UUID takebackOfferedById) { this.takebackOfferedById = takebackOfferedById; }
    }

    private boolean updateClocksOnMove(Game game, boolean isWhiteToMove) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastMoveAt = game.getLastMoveAt();

        // Count existing moves BEFORE this move
        int moveCount = moveRepository.findByGameIdOrderByMoveNumber(game.getId()).size();
        
        // For first two half-moves (first move of each player): just set timestamp, don't update time
        if (lastMoveAt == null || moveCount < 2) {
            game.setLastMoveAt(now);
            return false;
        }

        long elapsedMs = Duration.between(lastMoveAt, now).toMillis();
        
        // Increment is NOT applied to first move of each player (moves 1 and 2)
        long incrementMs = (moveCount >= 2) ? parseIncrementMs(game.getTimeControl()) : 0L;

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
        
        game.setLastMoveAt(now);
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
        game.setResult(whiteTimedOut ? "0-1" : "1-0");
        game.setResultReason("timeout");
        game.setFinishedAt(LocalDateTime.now());
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
            // Skip games with no moves yet (timer hasn't started)
            if (game.getLastMoveAt() == null) {
                continue;
            }
            
            // Skip games with less than 2 half-moves (timer starts after first move of each player)
            int halfMoveCount = getHalfMoveCount(game.getFenCurrent());
            if (halfMoveCount < 2) {
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
                onGameFinished(savedGame);
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
    public Game resign(String gameId, UUID userId) {
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
            game.setResult("0-1");
        } else {
            game.setResult("1-0");
        }
        game.setResultReason("resignation");

        Game savedGame = gameRepository.save(game);
        
        onGameFinished(savedGame);
        
        notifyGameUpdate(savedGame);
        
        return savedGame;
    }

    /**
     * Rematch with swapped colors
     */
    @Transactional
    public Game rematch(String gameId, UUID userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (!"finished".equals(game.getStatus())) {
            throw new RuntimeException("Game must be finished to rematch");
        }
        if (!game.isPlayerInGame(userId)) {
            throw new RuntimeException("User is not in this game");
        }

        return createGame(
                game.getPlayerBlack().getId(),
                game.getPlayerWhite().getId(),
                game.getTimeControl(),
                null,
                game.isRated()
        );
    }

    /**
     * Abort game before 2 full moves (no rating change)
     */
    @Transactional
    public Game abortGame(String gameId, UUID userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (!game.isActive()) {
            throw new RuntimeException("Game is not active");
        }
        if (!game.isPlayerInGame(userId)) {
            throw new RuntimeException("User is not in this game");
        }

        int moveCount = moveRepository.findByGameIdOrderByMoveNumber(gameId).size();
        if (moveCount >= 4) {
            throw new RuntimeException("Cannot abort after 2 full moves");
        }

        game.setStatus("abandoned");
        game.setFinishedAt(LocalDateTime.now());
        game.setResultReason("abort");
        game.setDrawOfferedBy(null);
        game.setTakebackOfferedBy(null);

        Game savedGame = gameRepository.save(game);
        onGameFinishedWithoutRating(savedGame);
        notifyGameUpdate(savedGame);
        return savedGame;
    }

    /**
     * Offer takeback of the last move
     */
    @Transactional
    public void offerTakeback(String gameId, UUID userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (!game.isActive()) {
            throw new RuntimeException("Game is not active");
        }
        if (!game.isPlayerInGame(userId)) {
            throw new RuntimeException("User is not in this game");
        }

        List<Move> moves = moveRepository.findByGameIdOrderByMoveNumber(gameId);
        if (moves.isEmpty()) {
            throw new RuntimeException("No moves to take back");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        game.setTakebackOfferedBy(user);
        gameRepository.save(game);
        notifyGameUpdate(game);
    }

    /**
     * Respond to takeback offer
     */
    @Transactional
    public void respondToTakeback(String gameId, UUID userId, boolean accept) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (!game.isActive()) {
            throw new RuntimeException("Game is not active");
        }
        if (!game.isPlayerInGame(userId)) {
            throw new RuntimeException("User is not in this game");
        }
        if (game.getTakebackOfferedBy() == null) {
            throw new RuntimeException("No takeback offer pending");
        }
        if (game.getTakebackOfferedBy().getId().equals(userId)) {
            throw new RuntimeException("Cannot respond to your own takeback offer");
        }

        if (accept) {
            List<Move> moves = moveRepository.findByGameIdOrderByMoveNumber(gameId);
            if (moves.isEmpty()) {
                throw new RuntimeException("No moves to take back");
            }
            Move lastMove = moves.get(moves.size() - 1);
            moveRepository.delete(lastMove);

            List<Move> remaining = moveRepository.findByGameIdOrderByMoveNumber(gameId);
            if (remaining.isEmpty()) {
                game.setFenCurrent("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
                game.setLastMoveAt(null);
            } else {
                Move previous = remaining.get(remaining.size() - 1);
                game.setFenCurrent(previous.getFen());
            }
            game.setTakebackOfferedBy(null);
            game.setDrawOfferedBy(null);
            gameRepository.save(game);
        } else {
            game.setTakebackOfferedBy(null);
            gameRepository.save(game);
        }

        notifyGameUpdate(game);
    }

    /**
     * Claim draw by stalemate or insufficient material
     */
    @Transactional
    public Game claimDraw(String gameId, UUID userId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        if (!game.isActive()) {
            throw new RuntimeException("Game is not active");
        }
        if (!game.isPlayerInGame(userId)) {
            throw new RuntimeException("User is not in this game");
        }

        Board board = new Board();
        board.loadFromFen(game.getFenCurrent());

        String reason;
        if (board.isStaleMate()) {
            reason = "stalemate";
        } else if (isInsufficientMaterial(board)) {
            reason = "insufficient material";
        } else {
            throw new RuntimeException("Draw cannot be claimed in this position");
        }

        game.setStatus("finished");
        game.setFinishedAt(LocalDateTime.now());
        game.setResult("1/2-1/2");
        game.setResultReason(reason);
        game.setDrawOfferedBy(null);
        game.setTakebackOfferedBy(null);

        Game savedGame = gameRepository.save(game);
        onGameFinished(savedGame);
        notifyGameUpdate(savedGame);
        return savedGame;
    }

    private boolean isInsufficientMaterial(Board board) {
        String placement = board.getFen().split(" ")[0];
        int whiteNonKing = 0;
        int blackNonKing = 0;

        for (char c : placement.toCharArray()) {
            if (c == '/' || Character.isDigit(c)) {
                continue;
            }
            if (c == 'K' || c == 'k') {
                continue;
            }
            if (c == 'P' || c == 'p' || c == 'R' || c == 'r' || c == 'Q' || c == 'q') {
                return false;
            }
            if (Character.isUpperCase(c)) {
                whiteNonKing++;
            } else {
                blackNonKing++;
            }
        }

        return whiteNonKing <= 1 && blackNonKing <= 1;
    }

    /**
     * Offer draw
     */
    @Transactional
    public void offerDraw(String gameId, UUID userId) {
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
    public void respondToDraw(String gameId, UUID userId, boolean accept) {
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
            game.setResult("1/2-1/2");
            game.setResultReason("agreement");
            game.setDrawOfferedBy(null);
            
            Game savedGame = gameRepository.save(game);
            
            onGameFinished(savedGame);
            
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
    public Game abandon(String gameId, UUID userId) {
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
    public List<Move> getGameMoves(String gameId) {
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
    public String generatePGN(String gameId) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        List<Move> moves = getGameMoves(gameId);

        StringBuilder pgn = new StringBuilder();
        pgn.append("[Event \"Online Chess\"]\n");
        pgn.append("[Site \"chessonline.app\"]\n");
        pgn.append("[Date \"").append(game.getCreatedAt().toLocalDate()).append("\"]\n");
        pgn.append("[White \"").append(game.getPlayerWhite().getUsername()).append("\"]\n");
        pgn.append("[Black \"").append(game.getPlayerBlack().getUsername()).append("\"]\n");
        pgn.append("[WhiteElo \"").append(game.getPlayerWhite().getRating()).append("\"]\n");
        pgn.append("[BlackElo \"").append(game.getPlayerBlack().getRating()).append("\"]\n");
        pgn.append("[TimeControl \"").append(game.getTimeControl()).append("\"]\n");

        if (game.getResult() != null) {
            pgn.append("[Result \"").append(game.getResult()).append("\"]\n");
        }

        if (game.getResultReason() != null) {
            pgn.append("[Termination \"").append(formatTermination(game.getResultReason())).append("\"]\n");
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
            pgn.append(game.getResult());
        }

        return pgn.toString();
    }

    private String formatTermination(String resultReason) {
        return switch (resultReason) {
            case "checkmate" -> "Checkmate";
            case "resignation" -> "Resignation";
            case "timeout" -> "Time forfeit";
            case "stalemate" -> "Stalemate";
            case "agreement" -> "Agreement";
            case "abort" -> "Aborted";
            case "insufficient material" -> "Insufficient material";
            default -> resultReason;
        };
    }

    /**
     * Enum for game end states
     */
    private enum GameEndState {
        ONGOING, CHECKMATE, STALEMATE
    }

    /**
     * Check if the game has ended using chesslib
     */
    private GameEndState checkGameEndWithChesslib(String fen) {
        try {
            Board board = new Board();
            board.loadFromFen(fen);
            
            System.out.println("🔍 checkGameEndWithChesslib - FEN: " + fen);
            System.out.println("🔍 Current turn to move: " + (board.getSideToMove().toString()));
            System.out.println("🔍 Is in check: " + board.isKingAttacked());
            System.out.println("🔍 Is checkmate: " + board.isMated());
            System.out.println("🔍 Is stalemate: " + board.isStaleMate());
            
            if (board.isMated()) {
                return GameEndState.CHECKMATE;
            } else if (board.isStaleMate()) {
                return GameEndState.STALEMATE;
            }
            
            return GameEndState.ONGOING;
        } catch (Exception e) {
            System.err.println("Error checking game end with chesslib: " + e.getMessage());
            e.printStackTrace();
            return GameEndState.ONGOING;
        }
    }

    /**
     * Remove lobby game entry by player IDs (for matchmaking-created games)
     */
    private void removeLobbyGameByPlayers(UUID whiteId, UUID blackId) {
        try {
            lobbyGameRepository.findAll().stream()
                .filter(lg -> {
                    UUID creatorId = lg.getCreator().getId();
                    return creatorId.equals(whiteId) || creatorId.equals(blackId);
                })
                .forEach(lg -> {
                    lobbyGameRepository.delete(lg);
                    System.out.println("🗑️ Removed lobby game: " + lg.getId() + " after game finished");
                });
        } catch (Exception e) {
            System.err.println("Error removing lobby game: " + e.getMessage());
        }
    }
}
