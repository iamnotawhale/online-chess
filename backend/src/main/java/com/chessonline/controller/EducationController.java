package com.chessonline.controller;

import com.chessonline.dto.education.LessonProgressRequest;
import com.chessonline.dto.education.LessonProgressResponse;
import com.chessonline.service.EducationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/education")
public class EducationController {

    private final EducationService educationService;

    public EducationController(EducationService educationService) {
        this.educationService = educationService;
    }

    @GetMapping("/progress")
    public List<LessonProgressResponse> getProgress() {
        return educationService.getMyProgress();
    }

    @PostMapping("/progress")
    public LessonProgressResponse updateProgress(@RequestBody LessonProgressRequest request) {
        return educationService.updateProgress(request);
    }
}
