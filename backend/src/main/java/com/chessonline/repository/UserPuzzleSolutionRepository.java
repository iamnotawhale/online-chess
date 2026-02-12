package com.chessonline.repository;

import com.chessonline.model.UserPuzzleSolution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserPuzzleSolutionRepository extends JpaRepository<UserPuzzleSolution, UUID> {
    
    Optional<UserPuzzleSolution> findByUserIdAndPuzzleId(UUID userId, String puzzleId);
    
    List<UserPuzzleSolution> findByUserIdOrderBySolvedAtDesc(UUID userId);
    
    @Query("SELECT COUNT(ups) FROM UserPuzzleSolution ups WHERE ups.userId = :userId AND ups.solved = true")
    long countSolvedByUserId(UUID userId);
    
    @Query("SELECT COUNT(ups) FROM UserPuzzleSolution ups WHERE ups.userId = :userId")
    long countAttemptsByUserId(UUID userId);
}
