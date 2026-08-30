package com.chessonline.service;

import com.chessonline.dto.PuzzleResponse;
import com.chessonline.model.PuzzleRushScore;
import com.chessonline.model.User;
import com.chessonline.repository.PuzzleRushScoreRepository;
import com.chessonline.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PuzzleRushService {

    private static final int SESSION_DURATION_SECONDS = 180;

    private final PuzzleService puzzleService;
    private final PuzzleRushScoreRepository scoreRepository;
    private final UserRepository userRepository;
    private final Map<UUID, RushSession> sessions = new ConcurrentHashMap<>();

    public PuzzleRushService(PuzzleService puzzleService,
                             PuzzleRushScoreRepository scoreRepository,
                             UserRepository userRepository) {
        this.puzzleService = puzzleService;
        this.scoreRepository = scoreRepository;
        this.userRepository = userRepository;
    }

    public Map<String, Object> startSession(UUID userId) {
        UUID sessionId = UUID.randomUUID();
        RushSession session = new RushSession(userId, Instant.now());
        sessions.put(sessionId, session);

        return Map.of(
                "sessionId", sessionId.toString(),
                "durationSeconds", SESSION_DURATION_SECONDS,
                "expiresAt", session.startedAt.plusSeconds(SESSION_DURATION_SECONDS).toString()
        );
    }

    public PuzzleResponse nextPuzzle(UUID sessionId, UUID userId) {
        RushSession session = getActiveSession(sessionId, userId);
        return puzzleService.getRandomPuzzle(userId.toString(), 800, 2000, List.of());
    }

    public Map<String, Object> finishSession(UUID sessionId, UUID userId, int score, int puzzlesSolved) {
        RushSession session = getActiveSession(sessionId, userId);
        sessions.remove(sessionId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        PuzzleRushScore record = new PuzzleRushScore();
        record.setUser(user);
        record.setScore(score);
        record.setPuzzlesSolved(puzzlesSolved);
        scoreRepository.save(record);

        return Map.of(
                "score", score,
                "puzzlesSolved", puzzlesSolved,
                "saved", true
        );
    }

    private RushSession getActiveSession(UUID sessionId, UUID userId) {
        RushSession session = sessions.get(sessionId);
        if (session == null) {
            throw new RuntimeException("Rush session not found or expired");
        }
        if (!session.userId.equals(userId)) {
            throw new RuntimeException("Not authorized for this session");
        }
        if (Instant.now().isAfter(session.startedAt.plusSeconds(SESSION_DURATION_SECONDS))) {
            sessions.remove(sessionId);
            throw new RuntimeException("Rush session expired");
        }
        return session;
    }

    private static class RushSession {
        private final UUID userId;
        private final Instant startedAt;

        private RushSession(UUID userId, Instant startedAt) {
            this.userId = userId;
            this.startedAt = startedAt;
        }
    }
}
