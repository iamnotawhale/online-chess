package com.chessonline.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_lesson_progress")
public class UserLessonProgress {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "lesson_id", nullable = false, length = 100)
    private String lessonId;

    @Column(name = "category_id", nullable = false, length = 50)
    private String categoryId;

    @Column(nullable = false)
    private boolean completed = false;

    @Column(name = "puzzles_solved", nullable = false)
    private int puzzlesSolved = 0;

    @Column(name = "puzzles_total", nullable = false)
    private int puzzlesTotal = 0;

    @Column(name = "viewed_at")
    private LocalDateTime viewedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getLessonId() { return lessonId; }
    public void setLessonId(String lessonId) { this.lessonId = lessonId; }

    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public int getPuzzlesSolved() { return puzzlesSolved; }
    public void setPuzzlesSolved(int puzzlesSolved) { this.puzzlesSolved = puzzlesSolved; }

    public int getPuzzlesTotal() { return puzzlesTotal; }
    public void setPuzzlesTotal(int puzzlesTotal) { this.puzzlesTotal = puzzlesTotal; }

    public LocalDateTime getViewedAt() { return viewedAt; }
    public void setViewedAt(LocalDateTime viewedAt) { this.viewedAt = viewedAt; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
