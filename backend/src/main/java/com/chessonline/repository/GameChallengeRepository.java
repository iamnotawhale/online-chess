package com.chessonline.repository;

import com.chessonline.model.GameChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GameChallengeRepository extends JpaRepository<GameChallenge, UUID> {
    List<GameChallenge> findByChallenged_IdAndStatusOrderByCreatedAtDesc(UUID challengedId, String status);
}
