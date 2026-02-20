package com.chessonline.repository;

import com.chessonline.model.UserLessonProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserLessonProgressRepository extends JpaRepository<UserLessonProgress, UUID> {
    List<UserLessonProgress> findByUserId(UUID userId);
    Optional<UserLessonProgress> findByUserIdAndLessonId(UUID userId, String lessonId);
}
