package com.chessonline.service;

import com.chessonline.model.Arena;
import com.chessonline.model.ArenaParticipant;
import com.chessonline.model.Game;
import com.chessonline.model.User;
import com.chessonline.repository.ArenaParticipantRepository;
import com.chessonline.repository.ArenaRepository;
import com.chessonline.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ArenaService {

    private final ArenaRepository arenaRepository;
    private final ArenaParticipantRepository participantRepository;
    private final UserRepository userRepository;

    public ArenaService(ArenaRepository arenaRepository,
                        ArenaParticipantRepository participantRepository,
                        UserRepository userRepository) {
        this.arenaRepository = arenaRepository;
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
    }

    @PostConstruct
    @Transactional
    public void seedActiveArenaIfNeeded() {
        List<Arena> active = arenaRepository.findByStatus("active");
        if (active.isEmpty()) {
            Arena arena = new Arena();
            arena.setName("Weekly Blitz Arena");
            arena.setTimeControl("3+2");
            arena.setStatus("active");
            arena.setStartsAt(Instant.now().minusSeconds(3600));
            arena.setEndsAt(Instant.now().plusSeconds(7 * 24 * 3600));
            arenaRepository.save(arena);
        }
    }

    @Transactional(readOnly = true)
    public List<Arena> getActiveArenas() {
        Instant now = Instant.now();
        return arenaRepository.findByStatus("active").stream()
                .filter(a -> !now.isBefore(a.getStartsAt()) && now.isBefore(a.getEndsAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Arena getArena(UUID arenaId) {
        return arenaRepository.findById(arenaId)
                .orElseThrow(() -> new RuntimeException("Arena not found"));
    }

    @Transactional(readOnly = true)
    public List<ArenaParticipant> getStandings(UUID arenaId) {
        getArena(arenaId);
        return participantRepository.findByArenaIdOrderByScoreDescGamesPlayedAsc(arenaId);
    }

    @Transactional
    public ArenaParticipant joinArena(UUID arenaId, UUID userId) {
        Arena arena = getArena(arenaId);
        if (!arena.isActive()) {
            throw new RuntimeException("Arena is not active");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Optional<ArenaParticipant> existing = participantRepository.findByArenaIdAndUserId(arenaId, userId);
        if (existing.isPresent()) {
            return existing.get();
        }

        ArenaParticipant participant = new ArenaParticipant();
        participant.setArenaId(arenaId);
        participant.setUserId(userId);
        participant.setScore(0);
        participant.setGamesPlayed(0);
        return participantRepository.save(participant);
    }

    @Transactional
    public void updateScoresOnGameFinish(Game game) {
        if (!"finished".equals(game.getStatus()) || game.getResult() == null) {
            return;
        }

        UUID whiteId = game.getPlayerWhite().getId();
        UUID blackId = game.getPlayerBlack().getId();
        Instant finishedAt = game.getFinishedAt() != null
                ? game.getFinishedAt().atZone(java.time.ZoneId.systemDefault()).toInstant()
                : Instant.now();

        List<Arena> activeArenas = getActiveArenas();
        for (Arena arena : activeArenas) {
            Optional<ArenaParticipant> whitePart = participantRepository.findByArenaIdAndUserId(arena.getId(), whiteId);
            Optional<ArenaParticipant> blackPart = participantRepository.findByArenaIdAndUserId(arena.getId(), blackId);

            if (whitePart.isEmpty() || blackPart.isEmpty()) {
                continue;
            }
            if (finishedAt.isBefore(arena.getStartsAt()) || !finishedAt.isBefore(arena.getEndsAt())) {
                continue;
            }

            int whitePoints = pointsForResult(game.getResult(), true);
            int blackPoints = pointsForResult(game.getResult(), false);

            ArenaParticipant wp = whitePart.get();
            wp.setScore(wp.getScore() + whitePoints);
            wp.setGamesPlayed(wp.getGamesPlayed() + 1);
            participantRepository.save(wp);

            ArenaParticipant bp = blackPart.get();
            bp.setScore(bp.getScore() + blackPoints);
            bp.setGamesPlayed(bp.getGamesPlayed() + 1);
            participantRepository.save(bp);
        }
    }

    private int pointsForResult(String result, boolean isWhite) {
        if ("1-0".equals(result)) {
            return isWhite ? 2 : 0;
        }
        if ("0-1".equals(result)) {
            return isWhite ? 0 : 2;
        }
        return 1;
    }
}
