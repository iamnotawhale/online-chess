package com.chessonline.service;

import com.chessonline.dto.education.LessonProgressRequest;
import com.chessonline.dto.education.LessonProgressResponse;
import com.chessonline.model.User;
import com.chessonline.model.UserLessonProgress;
import com.chessonline.repository.UserLessonProgressRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class EducationService {

    private final UserLessonProgressRepository progressRepository;
    private final UserService userService;

    public EducationService(UserLessonProgressRepository progressRepository, UserService userService) {
        this.progressRepository = progressRepository;
        this.userService = userService;
    }

    public List<LessonProgressResponse> getMyProgress() {
        User user = userService.getCurrentUserEntity();
        List<UserLessonProgress> progress = progressRepository.findByUserId(user.getId());
        return progress.stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public LessonProgressResponse updateProgress(LessonProgressRequest request) {
        if (request.getLessonId() == null || request.getLessonId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lessonId is required");
        }
        if (request.getCategoryId() == null || request.getCategoryId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "categoryId is required");
        }

        User user = userService.getCurrentUserEntity();
        UUID userId = user.getId();
        LocalDateTime now = LocalDateTime.now();

        Optional<UserLessonProgress> existing = progressRepository.findByUserIdAndLessonId(userId, request.getLessonId());
        UserLessonProgress progress = existing.orElseGet(() -> {
            UserLessonProgress created = new UserLessonProgress();
            created.setUserId(userId);
            created.setLessonId(request.getLessonId());
            created.setViewedAt(now);
            return created;
        });

        progress.setCategoryId(request.getCategoryId());
        progress.setPuzzlesSolved(Math.max(0, request.getPuzzlesSolved()));
        progress.setPuzzlesTotal(Math.max(0, request.getPuzzlesTotal()));

        boolean completed = request.isCompleted()
            || (progress.getPuzzlesTotal() > 0 && progress.getPuzzlesSolved() >= progress.getPuzzlesTotal());

        if (completed && !progress.isCompleted()) {
            progress.setCompletedAt(now);
        }
        if (progress.getViewedAt() == null) {
            progress.setViewedAt(now);
        }

        progress.setCompleted(completed);

        UserLessonProgress saved = progressRepository.save(progress);
        return toResponse(saved);
    }

    private LessonProgressResponse toResponse(UserLessonProgress progress) {
        LessonProgressResponse response = new LessonProgressResponse();
        response.setId(progress.getId());
        response.setLessonId(progress.getLessonId());
        response.setCategoryId(progress.getCategoryId());
        response.setCompleted(progress.isCompleted());
        response.setPuzzlesSolved(progress.getPuzzlesSolved());
        response.setPuzzlesTotal(progress.getPuzzlesTotal());
        response.setViewedAt(progress.getViewedAt());
        response.setCompletedAt(progress.getCompletedAt());
        return response;
    }
}
