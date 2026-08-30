package com.chessonline.repository;

import com.chessonline.model.ArenaParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ArenaParticipantRepository extends JpaRepository<ArenaParticipant, ArenaParticipant.ArenaParticipantId> {
    List<ArenaParticipant> findByArenaIdOrderByScoreDescGamesPlayedAsc(UUID arenaId);

    Optional<ArenaParticipant> findByArenaIdAndUserId(UUID arenaId, UUID userId);

    List<ArenaParticipant> findByUserId(UUID userId);
}
