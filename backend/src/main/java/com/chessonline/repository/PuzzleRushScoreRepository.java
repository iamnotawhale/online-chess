package com.chessonline.repository;

import com.chessonline.model.PuzzleRushScore;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PuzzleRushScoreRepository extends JpaRepository<PuzzleRushScore, UUID> {
}
