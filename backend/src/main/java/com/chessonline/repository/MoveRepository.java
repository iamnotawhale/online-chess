package com.chessonline.repository;

import com.chessonline.model.Move;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MoveRepository extends JpaRepository<Move, UUID> {
    
    List<Move> findByGameIdOrderByMoveNumber(String gameId);
    
    Move findTopByGameIdOrderByMoveNumberDesc(String gameId);
}
