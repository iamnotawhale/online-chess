package com.chessonline.service;

import com.chessonline.model.Game;
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
            "rapid", List.of("10+0", "10+5", "15+10", "25+0")
    );

    private final Map<String, Deque<UUID>> queues = new ConcurrentHashMap<>();
    private final Map<UUID, String> userQueueKeys = new ConcurrentHashMap<>();
    private final Map<UUID, UUID> matchedGames = new ConcurrentHashMap<>();
    private final Object queueLock = new Object();

    @Autowired
    private GameService gameService;

    public MatchmakingResult join(UUID userId, String gameMode, String timeControl) {
        validateTimeControl(gameMode, timeControl);

        synchronized (queueLock) {
            if (userQueueKeys.containsKey(userId)) {
                String existingKey = userQueueKeys.get(userId);
                return MatchmakingResult.queued(existingKey.split("\\|")[0], existingKey.split("\\|")[1]);
            }

            String key = key(gameMode, timeControl);
            Deque<UUID> queue = queues.computeIfAbsent(key, k -> new ArrayDeque<>());

            if (!queue.isEmpty()) {
                UUID opponentId = queue.poll();
                if (opponentId != null && opponentId.equals(userId)) {
                    return MatchmakingResult.queued(gameMode, timeControl);
                }

                if (opponentId != null) {
                    userQueueKeys.remove(opponentId);
                    UUID whiteId = ThreadLocalRandom.current().nextBoolean() ? userId : opponentId;
                    UUID blackId = whiteId.equals(userId) ? opponentId : userId;
                    Game game = gameService.createGame(whiteId, blackId, timeControl, null);
                    matchedGames.put(opponentId, game.getId());
                    return MatchmakingResult.matched(game.getId(), gameMode, timeControl);
                }
            }

            queue.add(userId);
            userQueueKeys.put(userId, key);
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
        }
    }

    public MatchmakingStatus status(UUID userId) {
        UUID matchedGameId = matchedGames.remove(userId);
        if (matchedGameId != null) {
            return new MatchmakingStatus(false, true, matchedGameId, null, null);
        }
        String key = userQueueKeys.get(userId);
        if (key == null) {
            return new MatchmakingStatus(false, false, null, null, null);
        }
        String[] parts = key.split("\\|");
        return new MatchmakingStatus(true, false, null, parts[0], parts[1]);
    }

    private void validateTimeControl(String gameMode, String timeControl) {
        if (!ALLOWED_TIME_CONTROLS.containsKey(gameMode)) {
            throw new RuntimeException("Unsupported game mode");
        }
        if (!ALLOWED_TIME_CONTROLS.get(gameMode).contains(timeControl)) {
            throw new RuntimeException("Unsupported time control");
        }
    }

    private String key(String gameMode, String timeControl) {
        return gameMode + "|" + timeControl;
    }

    public static class MatchmakingResult {
        private final boolean matched;
        private final UUID gameId;
        private final String gameMode;
        private final String timeControl;

        private MatchmakingResult(boolean matched, UUID gameId, String gameMode, String timeControl) {
            this.matched = matched;
            this.gameId = gameId;
            this.gameMode = gameMode;
            this.timeControl = timeControl;
        }

        public static MatchmakingResult matched(UUID gameId, String gameMode, String timeControl) {
            return new MatchmakingResult(true, gameId, gameMode, timeControl);
        }

        public static MatchmakingResult queued(String gameMode, String timeControl) {
            return new MatchmakingResult(false, null, gameMode, timeControl);
        }

        public boolean isMatched() {
            return matched;
        }

        public UUID getGameId() {
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
        private final UUID gameId;
        private final String gameMode;
        private final String timeControl;

        public MatchmakingStatus(boolean queued, boolean matched, UUID gameId, String gameMode, String timeControl) {
            this.queued = queued;
            this.matched = matched;
            this.gameId = gameId;
            this.gameMode = gameMode;
            this.timeControl = timeControl;
        }

        public boolean isQueued() {
            return queued;
        }

        public boolean isMatched() {
            return matched;
        }

        public UUID getGameId() {
            return gameId;
        }

        public String getGameMode() {
            return gameMode;
        }

        public String getTimeControl() {
            return timeControl;
        }
    }
}
