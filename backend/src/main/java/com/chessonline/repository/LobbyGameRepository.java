package com.chessonline.repository;

import com.chessonline.model.LobbyGame;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LobbyGameRepository extends JpaRepository<LobbyGame, UUID> {
}
