package com.chessonline.controller;

import java.util.List;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.chessonline.dto.user.UpdateProfileRequest;
import com.chessonline.dto.user.UserResponse;
import com.chessonline.service.UserService;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserResponse> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/me")
    public UserResponse me() {
        return userService.getMe();
    }

    @GetMapping("/search")
    public List<UserResponse> search(
            @RequestParam("q") String query,
            @RequestParam(defaultValue = "20") int limit) {
        return userService.searchUsers(query, limit);
    }

    @PostMapping("/me/ping")
    public Map<String, Object> ping(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        userService.ping(userId);
        return Map.of("ok", true);
    }

    @GetMapping("/{username}")
    public UserResponse publicProfile(@PathVariable String username) {
        return userService.getPublicProfile(username);
    }

    @PatchMapping("/me")
    public UserResponse update(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(request);
    }
}
