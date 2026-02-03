package com.chessonline.service;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.chessonline.dto.auth.AuthResponse;
import com.chessonline.dto.auth.LoginRequest;
import com.chessonline.dto.auth.RegisterRequest;
import com.chessonline.dto.user.UserResponse;
import com.chessonline.model.User;
import com.chessonline.model.UserStats;
import com.chessonline.repository.UserRepository;
import com.chessonline.repository.UserStatsRepository;
import com.chessonline.security.JwtService;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final UserStatsRepository userStatsRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserService userService;

    public AuthService(UserRepository userRepository,
                       UserStatsRepository userStatsRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       UserService userService) {
        this.userRepository = userRepository;
        this.userStatsRepository = userStatsRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userService = userService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already in use");
        }

        User user = new User();
        user.setUsername(request.getUsername().trim());
        user.setEmail(request.getEmail().trim().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));

        User saved = userRepository.save(user);

        UserStats stats = new UserStats();
        stats.setUser(saved);
        userStatsRepository.save(stats);

        String token = jwtService.generateToken(saved.getId().toString(), saved.getUsername());
        UserResponse response = userService.toUserResponse(saved, true);
        return new AuthResponse(token, response);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = jwtService.generateToken(user.getId().toString(), user.getUsername());
        UserResponse response = userService.toUserResponse(user, true);
        return new AuthResponse(token, response);
    }

    public UUID requireUserId(String userId) {
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }
    }
}
