package com.chessonline.controller;

import com.chessonline.dto.CreateInviteRequest;
import com.chessonline.dto.InviteResponse;
import com.chessonline.dto.GameResponse;
import com.chessonline.model.Invite;
import com.chessonline.model.Game;
import com.chessonline.service.InviteService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/invites")
public class InviteController {

    @Autowired
    private InviteService inviteService;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    /**
     * Create a new invite
     */
    @PostMapping
    public ResponseEntity<?> createInvite(
            @Valid @RequestBody CreateInviteRequest request,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            Invite invite = inviteService.createInvite(
                    userId,
                    request.getGameMode(),
                    request.getTimeControl(),
                    request.getExpirationHours(),
                    request.isRated(),
                    request.getPreferredColor()
            );

            InviteResponse response = mapToResponse(invite);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get invite by code
     */
    @GetMapping("/{code}")
    public ResponseEntity<?> getInvite(@PathVariable String code) {
        try {
            Invite invite = inviteService.getInviteByCode(code)
                    .orElseThrow(() -> new RuntimeException("Invite not found"));

            InviteResponse response = mapToResponse(invite);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Accept an invite
     */
    @PostMapping("/{code}/accept")
    public ResponseEntity<?> acceptInvite(
            @PathVariable String code,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            Game game = inviteService.acceptInvite(code, userId);
            GameResponse response = mapToGameResponse(game);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Cancel an invite
     */
    @DeleteMapping("/{code}")
    public ResponseEntity<?> cancelInvite(
            @PathVariable String code,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            inviteService.cancelInvite(code, userId);
            return ResponseEntity.ok(Map.of("message", "Invite cancelled successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get user's active invites
     */
    @GetMapping("/my/active")
    public ResponseEntity<?> getMyActiveInvites(Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            List<Invite> invites = inviteService.getActiveInvites(userId);

            List<InviteResponse> responses = invites.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get all user's invites
     */
    @GetMapping("/my")
    public ResponseEntity<?> getMyInvites(Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            List<Invite> invites = inviteService.getAllInvites(userId);

            List<InviteResponse> responses = invites.stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Map Invite entity to response DTO
     */
    private InviteResponse mapToResponse(Invite invite) {
        InviteResponse response = new InviteResponse();
        response.setId(invite.getId());
        response.setCode(invite.getCode());
        response.setInviteUrl(frontendUrl + "/invite/" + invite.getCode());
        response.setGameMode(invite.getGameMode());
        response.setTimeControl(invite.getTimeControl());
        response.setRated(invite.isRated());
        response.setPreferredColor(invite.getPreferredColor());
        response.setExpiresAt(invite.getExpiresAt());
        response.setUsed(invite.getUsed());
        response.setUsedAt(invite.getUsedAt());
        response.setCreatorUsername(invite.getCreator().getUsername());
        if (invite.getAcceptedBy() != null) {
            response.setAcceptedByUsername(invite.getAcceptedBy().getUsername());
        }
        response.setCreatedAt(invite.getCreatedAt());
        return response;
    }

    private GameResponse mapToGameResponse(Game game) {
        GameResponse response = new GameResponse();
        response.setId(game.getId());
        response.setWhitePlayerId(game.getPlayerWhite().getId());
        response.setWhiteUsername(game.getPlayerWhite().getUsername());
        response.setBlackPlayerId(game.getPlayerBlack().getId());
        response.setBlackUsername(game.getPlayerBlack().getUsername());
        response.setStatus(game.getStatus());
        response.setResult(game.getResult());
        response.setResultReason(game.getResultReason());
        response.setTimeControl(game.getTimeControl());
        response.setFenCurrent(game.getFenCurrent());
        response.setWhiteTimeLeftMs(game.getWhiteTimeLeftMs());
        response.setBlackTimeLeftMs(game.getBlackTimeLeftMs());
        response.setLastMoveAt(game.getLastMoveAt());
        response.setCreatedAt(game.getCreatedAt());
        response.setFinishedAt(game.getFinishedAt());
        response.setDrawOfferedById(game.getDrawOfferedBy() != null ? game.getDrawOfferedBy().getId() : null);
        return response;
    }
}
