package com.chessonline.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.chessonline.model.UserStats;

public interface UserStatsRepository extends JpaRepository<UserStats, UUID> {
}
