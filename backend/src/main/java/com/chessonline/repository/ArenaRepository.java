package com.chessonline.repository;

import com.chessonline.model.Arena;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ArenaRepository extends JpaRepository<Arena, UUID> {
    List<Arena> findByStatus(String status);
}
