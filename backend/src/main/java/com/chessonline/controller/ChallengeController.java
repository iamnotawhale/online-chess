package com.chessonline.controller;

import com.chessonline.dto.GameResponse;
import com.chessonline.model.Game;
import com.chessonline.model.GameChallenge;
import com.chessonline.service.ChallengeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/challenges")
public class ChallengeController {

    private final ChallengeService challengeService;

    public ChallengeController(ChallengeService challengeService) {
        this.challengeService = challengeService;
    }

    @PostMapping
    public ResponseEntity<?> createChallenge(
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            UUID challengedId = UUID.fromString(body.get("userId").toString());
            String timeControl = body.containsKey("timeControl")
                    ? body.get("timeControl").toString()
                    : "5+3";
            boolean rated = !body.containsKey("rated") || Boolean.parseBoolean(body.get("rated").toString());

            GameChallenge challenge = challengeService.createChallenge(userId, challengedId, timeControl, rated);
            return ResponseEntity.status(HttpStatus.CREATED).body(mapChallenge(challenge));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/incoming")
    public ResponseEntity<?> getIncoming(Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            List<Map<String, Object>> challenges = challengeService.getIncomingChallenges(userId).stream()
                    .map(this::mapChallenge)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(challenges);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/accept/{id}")
    public ResponseEntity<?> acceptChallenge(@PathVariable UUID id, Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            Game game = challengeService.acceptChallenge(id, userId);
            GameResponse response = new GameResponse();
            response.setId(game.getId());
            response.setWhitePlayerId(game.getPlayerWhite().getId());
            response.setWhiteUsername(game.getPlayerWhite().getUsername());
            response.setBlackPlayerId(game.getPlayerBlack().getId());
            response.setBlackUsername(game.getPlayerBlack().getUsername());
            response.setStatus(game.getStatus());
            response.setTimeControl(game.getTimeControl());
            response.setRated(game.isRated());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/decline/{id}")
    public ResponseEntity<?> declineChallenge(@PathVariable UUID id, Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            GameChallenge challenge = challengeService.declineChallenge(id, userId);
            return ResponseEntity.ok(mapChallenge(challenge));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Map<String, Object> mapChallenge(GameChallenge challenge) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", challenge.getId());
        map.put("challengerId", challenge.getChallenger().getId());
        map.put("challengerUsername", challenge.getChallenger().getUsername());
        map.put("challengedId", challenge.getChallenged().getId());
        map.put("challengedUsername", challenge.getChallenged().getUsername());
        map.put("timeControl", challenge.getTimeControl());
        map.put("rated", challenge.isRated());
        map.put("status", challenge.getStatus());
        map.put("gameId", challenge.getGame() != null ? challenge.getGame().getId() : null);
        map.put("createdAt", challenge.getCreatedAt().toString());
        map.put("expiresAt", challenge.getExpiresAt().toString());
        return map;
    }
}
