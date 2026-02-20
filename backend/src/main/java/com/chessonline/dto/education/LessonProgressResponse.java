package com.chessonline.dto.education;

import java.time.LocalDateTime;
import java.util.UUID;

public class LessonProgressResponse {
    private UUID id;
    private String lessonId;
    private String categoryId;
    private boolean completed;
    private int puzzlesSolved;
    private int puzzlesTotal;
    private LocalDateTime viewedAt;
    private LocalDateTime completedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

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
