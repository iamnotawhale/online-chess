package com.chessonline.repository;

import com.chessonline.model.Puzzle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PuzzleRepository extends JpaRepository<Puzzle, String> {
	Optional<Puzzle> findByIdIgnoreCase(String id);
}
