package com.chessonline.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.chessonline.dto.user.UpdateProfileRequest;
import com.chessonline.dto.user.UserResponse;
import com.chessonline.dto.user.UserStatsResponse;
import com.chessonline.model.User;
import com.chessonline.repository.GameRepository;
import com.chessonline.repository.UserRepository;

@Service
public class UserService {

    private static final Duration ONLINE_THRESHOLD = Duration.ofMinutes(2);

    private final UserRepository userRepository;
    private final GameRepository gameRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, GameRepository gameRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.gameRepository = gameRepository;
        this.passwordEncoder = passwordEncoder;
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

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
            .map(user -> toUserResponse(user, false))
            .collect(Collectors.toList());
    }

    public UserResponse getPublicProfile(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        UserResponse response = toUserResponse(user, false);
        response.setOnline(isOnline(user));
        return response;
    }

    @Transactional
    public void ping(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setLastSeenAt(Instant.now());
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> searchUsers(String query, int limit) {
        if (query == null || query.trim().length() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Query must be at least 2 characters");
        }
        int cappedLimit = Math.min(Math.max(limit, 1), 50);
        return userRepository.searchByUsername(query.trim(), PageRequest.of(0, cappedLimit)).stream()
            .map(user -> {
                UserResponse response = toUserResponse(user, false);
                response.setOnline(isOnline(user));
                return response;
            })
            .collect(Collectors.toList());
    }

    public boolean isOnline(User user) {
        Instant lastSeen = user.getLastSeenAt();
        if (lastSeen == null) {
            return false;
        }
        return Duration.between(lastSeen, Instant.now()).compareTo(ONLINE_THRESHOLD) < 0;
    }

    public User getUserEntity(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public UserResponse updateProfile(UpdateProfileRequest request) {
        User user = getCurrentUserEntity();
        
        // Update username if provided
        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
            String newUsername = request.getUsername().trim();
            if (!newUsername.equals(user.getUsername())) {
                // Check if username is already taken
                if (userRepository.existsByUsername(newUsername)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
                }
                user.setUsername(newUsername);
            }
        }
        
        // Update password if provided
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }
        
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
        UserStatsResponse statsResponse = calculateStats(user);

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

    private UserStatsResponse calculateStats(User user) {
        int wins = 0;
        int losses = 0;
        int draws = 0;

        List<com.chessonline.model.Game> games = gameRepository.findFinishedGamesByUserId("finished", user.getId());
        for (com.chessonline.model.Game game : games) {
            String result = game.getResult();
            if (result == null) {
                continue;
            }

            boolean isWhite = game.getPlayerWhite().getId().equals(user.getId());

            if ("1-0".equals(result)) {
                if (isWhite) {
                    wins++;
                } else {
                    losses++;
                }
            } else if ("0-1".equals(result)) {
                if (isWhite) {
                    losses++;
                } else {
                    wins++;
                }
            } else if ("1/2-1/2".equals(result)) {
                draws++;
            }
        }

        int totalGames = wins + losses + draws;
        return new UserStatsResponse(wins, losses, draws, totalGames);
    }
}
