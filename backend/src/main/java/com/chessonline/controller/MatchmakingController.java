package com.chessonline.controller;

import com.chessonline.dto.MatchmakingJoinRequest;
import com.chessonline.dto.MatchmakingJoinResponse;
import com.chessonline.dto.MatchmakingStatusResponse;
import com.chessonline.service.MatchmakingService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/matchmaking")
public class MatchmakingController {

    @Autowired
    private MatchmakingService matchmakingService;

    @PostMapping("/join")
    public ResponseEntity<?> join(@Valid @RequestBody MatchmakingJoinRequest request, Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            MatchmakingService.MatchmakingResult result = matchmakingService.join(
                    userId,
                    request.getGameMode(),
                    request.getTimeControl(),
                    request.getPreferredColor(),
                    request.isRated()
            );

            MatchmakingJoinResponse response = new MatchmakingJoinResponse();
            response.setMatched(result.isMatched());
            response.setQueued(!result.isMatched());
            response.setGameId(result.getGameId());
            response.setGameMode(result.getGameMode());
            response.setTimeControl(result.getTimeControl());
            response.setMessage(result.isMatched() ? "Матч найден" : "Вы в очереди");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/leave")
    public ResponseEntity<?> leave(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        matchmakingService.leave(userId);
        return ResponseEntity.ok(Map.of("message", "Вы вышли из очереди"));
    }

    @GetMapping("/status")
    public ResponseEntity<?> status(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        MatchmakingService.MatchmakingStatus status = matchmakingService.status(userId);

        MatchmakingStatusResponse response = new MatchmakingStatusResponse();
        response.setQueued(status.isQueued());
        response.setMatched(status.isMatched());
        response.setGameId(status.getGameId());
        response.setGameMode(status.getGameMode());
        response.setTimeControl(status.getTimeControl());

        return ResponseEntity.ok(response);
    }
}
