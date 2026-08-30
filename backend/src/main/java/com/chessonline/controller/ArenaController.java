package com.chessonline.controller;

import com.chessonline.model.Arena;
import com.chessonline.model.ArenaParticipant;
import com.chessonline.service.ArenaService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/arenas")
public class ArenaController {

    private final ArenaService arenaService;

    public ArenaController(ArenaService arenaService) {
        this.arenaService = arenaService;
    }

    @GetMapping
    public ResponseEntity<?> getActiveArenas() {
        try {
            List<Map<String, Object>> arenas = arenaService.getActiveArenas().stream()
                    .map(this::mapArena)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(arenas);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getArena(@PathVariable UUID id) {
        try {
            Arena arena = arenaService.getArena(id);
            return ResponseEntity.ok(mapArena(arena));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/standings")
    public ResponseEntity<?> getStandings(@PathVariable UUID id) {
        try {
            List<Map<String, Object>> standings = arenaService.getStandings(id).stream()
                    .map(this::mapParticipant)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(standings);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<?> joinArena(@PathVariable UUID id, Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            ArenaParticipant participant = arenaService.joinArena(id, userId);
            return ResponseEntity.ok(mapParticipant(participant));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Map<String, Object> mapArena(Arena arena) {
        return Map.of(
                "id", arena.getId(),
                "name", arena.getName(),
                "timeControl", arena.getTimeControl(),
                "status", arena.getStatus(),
                "startsAt", arena.getStartsAt().toString(),
                "endsAt", arena.getEndsAt().toString(),
                "active", arena.isActive()
        );
    }

    private Map<String, Object> mapParticipant(ArenaParticipant participant) {
        return Map.of(
                "arenaId", participant.getArenaId(),
                "userId", participant.getUserId(),
                "username", participant.getUser().getUsername(),
                "score", participant.getScore(),
                "gamesPlayed", participant.getGamesPlayed(),
                "joinedAt", participant.getJoinedAt().toString()
        );
    }
}
