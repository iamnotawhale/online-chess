package com.chessonline.repository;

import com.chessonline.model.Game;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Query("SELECT g FROM Game g WHERE g.status = :status AND (g.playerWhite.id = :userId OR g.playerBlack.id = :userId) ORDER BY g.finishedAt DESC")
    List<Game> findFinishedGamesByUserId(@Param("status") String status, @Param("userId") UUID userId);
}
