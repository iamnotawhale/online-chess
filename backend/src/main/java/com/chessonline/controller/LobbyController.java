package com.chessonline.controller;

import com.chessonline.dto.CreateLobbyGameRequest;
import com.chessonline.dto.LobbyGameResponse;
import com.chessonline.service.LobbyService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/lobby")
public class LobbyController {
    @Autowired
    private LobbyService lobbyService;

    @PostMapping("/create")
    public ResponseEntity<?> createLobbyGame(
            @Valid @RequestBody CreateLobbyGameRequest request,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            LobbyGameResponse response = lobbyService.createLobbyGame(userId, request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/games")
    public ResponseEntity<?> getLobbyGames() {
        try {
            List<LobbyGameResponse> games = lobbyService.getAllLobbyGames();
            return ResponseEntity.ok(games);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/join/{gameId}")
    public ResponseEntity<?> joinLobbyGame(
            @PathVariable UUID gameId,
            Authentication authentication) {
        try {
            UUID opponentId = UUID.fromString(authentication.getName());
            String createdGameId = lobbyService.joinLobbyGame(gameId, opponentId);
            return ResponseEntity.ok(Map.of("gameId", createdGameId, "message", "Joined the game"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{gameId}")
    public ResponseEntity<?> cancelLobbyGame(
            @PathVariable UUID gameId,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            lobbyService.cancelLobbyGame(gameId, userId);
            return ResponseEntity.ok(Map.of("message", "Game canceled"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
