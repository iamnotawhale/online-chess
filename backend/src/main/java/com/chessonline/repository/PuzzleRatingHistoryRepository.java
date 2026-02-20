package com.chessonline.repository;

import com.chessonline.model.PuzzleRatingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PuzzleRatingHistoryRepository extends JpaRepository<PuzzleRatingHistory, UUID> {

    List<PuzzleRatingHistory> findTop8ByUserIdOrderByCreatedAtDesc(UUID userId);
}
