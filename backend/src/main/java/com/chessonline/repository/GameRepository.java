package com.chessonline.repository;

import com.chessonline.model.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GameRepository extends JpaRepository<Game, UUID> {
    
    List<Game> findByPlayerWhiteIdOrPlayerBlackIdOrderByCreatedAtDesc(UUID whiteId, UUID blackId);
    
    List<Game> findByStatusAndPlayerWhiteIdOrPlayerBlackId(String status, UUID whiteId, UUID blackId);

    List<Game> findByStatus(String status);
    
    Optional<Game> findByIdAndPlayerWhiteIdOrPlayerBlackId(UUID gameId, UUID playerId, UUID playerId2);

    List<Game> findByStatusAndPlayerWhiteIdOrStatusAndPlayerBlackIdOrderByFinishedAtDesc(
            String status1, UUID whiteId, String status2, UUID blackId);
}
