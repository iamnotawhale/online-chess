package com.chessonline.repository;

import com.chessonline.model.RatingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RatingHistoryRepository extends JpaRepository<RatingHistory, UUID> {
    
    List<RatingHistory> findByUserIdOrderByCreatedAtDesc(UUID userId);
    
    List<RatingHistory> findByGameIdOrderByCreatedAtDesc(UUID gameId);
}
