package com.chessonline.service;

import com.chessonline.model.Game;
import com.chessonline.model.LobbyGame;
import com.chessonline.model.User;
import com.chessonline.repository.LobbyGameRepository;
import com.chessonline.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class MatchmakingService {

    private static final Map<String, List<String>> ALLOWED_TIME_CONTROLS = Map.of(
            "bullet", List.of("1+0", "2+1"),
            "blitz", List.of("3+0", "3+2", "5+0", "5+3"),
            "rapid", List.of("10+0", "10+5", "15+10", "25+0"),
            "classic", List.of("30+0", "30+30"),
            "custom", List.of() // Custom allows any time control
    );

    private final Map<String, Deque<UUID>> queues = new ConcurrentHashMap<>();
    private final Map<UUID, String> userQueueKeys = new ConcurrentHashMap<>();
    private final Map<UUID, String> matchedGames = new ConcurrentHashMap<>();
    private final Object queueLock = new Object();

    @Autowired
    private GameService gameService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LobbyGameRepository lobbyGameRepository;

    public MatchmakingResult join(UUID userId, String gameMode, String timeControl, String preferredColor, boolean isRated) {
        validateTimeControl(gameMode, timeControl);

        synchronized (queueLock) {
            if (userQueueKeys.containsKey(userId)) {
                String existingKey = userQueueKeys.get(userId);
                String[] parts = existingKey.split("\\|");
                String color = parts.length > 2 ? parts[2] : "random";
                return MatchmakingResult.queued(parts[0], parts[1]);
            }

            String key = key(gameMode, timeControl, preferredColor);
            Deque<UUID> queue = queues.computeIfAbsent(key, k -> new ArrayDeque<>());

            if (!queue.isEmpty()) {
                UUID opponentId = queue.poll();
                if (opponentId != null && opponentId.equals(userId)) {
                    return MatchmakingResult.queued(gameMode, timeControl);
                }

                if (opponentId != null) {
                    userQueueKeys.remove(opponentId);
                    
                    // Assign colors based on preferredColor
                    UUID whiteId, blackId;
                    if ("white".equals(preferredColor)) {
                        whiteId = userId;
                        blackId = opponentId;
                    } else if ("black".equals(preferredColor)) {
                        whiteId = opponentId;
                        blackId = userId;
                    } else {
                        // "random" or null - use random assignment
                        whiteId = ThreadLocalRandom.current().nextBoolean() ? userId : opponentId;
                        blackId = whiteId.equals(userId) ? opponentId : userId;
                    }
                    
                    Game game = gameService.createGame(whiteId, blackId, timeControl, null, isRated);
                    matchedGames.put(opponentId, game.getId());
                    return MatchmakingResult.matched(game.getId(), gameMode, timeControl);
                }
            }

            queue.add(userId);
            userQueueKeys.put(userId, key);
            
            // Add to lobby for all game modes
            try {
                User creator = userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found"));
                String color = preferredColor != null ? preferredColor : "random";
                LobbyGame lobbyGame = new LobbyGame(creator, gameMode, timeControl, color, isRated);
                lobbyGameRepository.save(lobbyGame);
            } catch (Exception e) {
                // Log error but don't fail matchmaking
                System.err.println("Error creating lobby game for matchmaking: " + e.getMessage());
            }
            
            return MatchmakingResult.queued(gameMode, timeControl);
        }
    }

    public void leave(UUID userId) {
        synchronized (queueLock) {
            String key = userQueueKeys.remove(userId);
            if (key == null) {
                return;
            }
            Deque<UUID> queue = queues.get(key);
            if (queue != null) {
                queue.remove(userId);
            }
            
            // Also remove from lobby if it was created for this user
            try {
                var lobbyGames = lobbyGameRepository.findAll()
                        .stream()
                        .filter(game -> game.getCreator().getId().equals(userId))
                        .toList();
                if (!lobbyGames.isEmpty()) {
                    lobbyGameRepository.deleteAll(lobbyGames);
                }
            } catch (Exception e) {
                System.err.println("Error removing lobby game when leaving queue: " + e.getMessage());
            }
        }
    }

    public MatchmakingStatus status(UUID userId) {
        String matchedGameId = matchedGames.remove(userId);
        if (matchedGameId != null) {
            return new MatchmakingStatus(false, true, matchedGameId, null, null, null);
        }
        String key = userQueueKeys.get(userId);
        if (key == null) {
            return new MatchmakingStatus(false, false, null, null, null, null);
        }
        String[] parts = key.split("\\|");
        String color = parts.length > 2 ? parts[2] : "random";
        return new MatchmakingStatus(true, false, null, parts[0], parts[1], color);
    }

    private void validateTimeControl(String gameMode, String timeControl) {
        if (!ALLOWED_TIME_CONTROLS.containsKey(gameMode)) {
            throw new RuntimeException("Unsupported game mode");
        }
        // For custom mode, allow any time control format (M+S where M and S are numbers)
        if ("custom".equals(gameMode)) {
            if (!timeControl.matches("\\d+\\+\\d+")) {
                throw new RuntimeException("Invalid custom time control format. Use format: minutes+increment (e.g., 5+3)");
            }
        } else {
            // For other modes, validate against predefined list
            if (!ALLOWED_TIME_CONTROLS.get(gameMode).contains(timeControl)) {
                throw new RuntimeException("Unsupported time control");
            }
        }
    }

    private String key(String gameMode, String timeControl, String preferredColor) {
        return gameMode + "|" + timeControl + "|" + (preferredColor != null ? preferredColor : "random");
    }

    public static class MatchmakingResult {
        private final boolean matched;
        private final String gameId;
        private final String gameMode;
        private final String timeControl;

        private MatchmakingResult(boolean matched, String gameId, String gameMode, String timeControl) {
            this.matched = matched;
            this.gameId = gameId;
            this.gameMode = gameMode;
            this.timeControl = timeControl;
        }

        public static MatchmakingResult matched(String gameId, String gameMode, String timeControl) {
            return new MatchmakingResult(true, gameId, gameMode, timeControl);
        }

        public static MatchmakingResult queued(String gameMode, String timeControl) {
            return new MatchmakingResult(false, null, gameMode, timeControl);
        }

        public boolean isMatched() {
            return matched;
        }

        public String getGameId() {
            return gameId;
        }

        public String getGameMode() {
            return gameMode;
        }

        public String getTimeControl() {
            return timeControl;
        }
    }

    public static class MatchmakingStatus {
        private final boolean queued;
        private final boolean matched;
        private final String gameId;
        private final String gameMode;
        private final String timeControl;
        private final String preferredColor;

        public MatchmakingStatus(boolean queued, boolean matched, String gameId, String gameMode, String timeControl, String preferredColor) {
            this.queued = queued;
            this.matched = matched;
            this.gameId = gameId;
            this.gameMode = gameMode;
            this.timeControl = timeControl;
            this.preferredColor = preferredColor;
        }

        public boolean isQueued() {
            return queued;
        }

        public boolean isMatched() {
            return matched;
        }

        public String getGameId() {
            return gameId;
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
    }
}
