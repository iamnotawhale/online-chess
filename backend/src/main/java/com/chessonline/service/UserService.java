package com.chessonline.service;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.chessonline.dto.user.UpdateProfileRequest;
import com.chessonline.dto.user.UserResponse;
import com.chessonline.dto.user.UserStatsResponse;
import com.chessonline.model.User;
import com.chessonline.model.UserStats;
import com.chessonline.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUserEntity() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        String userId = auth.getPrincipal().toString();
        UUID uuid;
        try {
            uuid = UUID.fromString(userId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }

        return userRepository.findById(uuid)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    public UserResponse getMe() {
        User user = getCurrentUserEntity();
        return toUserResponse(user, true);
    }

    public UserResponse getPublicProfile(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return toUserResponse(user, false);
    }

    public UserResponse updateProfile(UpdateProfileRequest request) {
        User user = getCurrentUserEntity();
        if (request.getCountry() != null) {
            user.setCountry(request.getCountry());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }

        User saved = userRepository.save(user);
        return toUserResponse(saved, true);
    }

    public UserResponse toUserResponse(User user, boolean includeEmail) {
        UserStats stats = user.getStats();
        UserStatsResponse statsResponse = null;
        if (stats != null) {
            statsResponse = new UserStatsResponse(
                stats.getWins(),
                stats.getLosses(),
                stats.getDraws(),
                stats.getTotalGames()
            );
        }

        return new UserResponse(
            user.getId(),
            user.getUsername(),
            includeEmail ? user.getEmail() : null,
            user.getRating(),
            user.getCountry(),
            user.getBio(),
            user.getAvatarUrl(),
            user.getCreatedAt(),
            statsResponse
        );
    }
}
