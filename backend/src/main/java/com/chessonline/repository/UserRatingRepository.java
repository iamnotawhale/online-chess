package com.chessonline.repository;

import com.chessonline.model.UserRating;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserRatingRepository extends JpaRepository<UserRating, UserRating.UserRatingId> {
    List<UserRating> findByUserId(UUID userId);
}
