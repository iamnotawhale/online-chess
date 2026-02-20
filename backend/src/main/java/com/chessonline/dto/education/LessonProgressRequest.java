package com.chessonline.dto.education;

public class LessonProgressRequest {
    private String lessonId;
    private String categoryId;
    private int puzzlesSolved;
    private int puzzlesTotal;
    private boolean completed;

    public String getLessonId() { return lessonId; }
    public void setLessonId(String lessonId) { this.lessonId = lessonId; }

    public String getCategoryId() { return categoryId; }
    public void setCategoryId(String categoryId) { this.categoryId = categoryId; }

    public int getPuzzlesSolved() { return puzzlesSolved; }
    public void setPuzzlesSolved(int puzzlesSolved) { this.puzzlesSolved = puzzlesSolved; }

    public int getPuzzlesTotal() { return puzzlesTotal; }
    public void setPuzzlesTotal(int puzzlesTotal) { this.puzzlesTotal = puzzlesTotal; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }
}
