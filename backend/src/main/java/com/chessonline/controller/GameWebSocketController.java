package com.chessonline.controller;

import com.chessonline.dto.GameResponse;
import com.chessonline.dto.MakeMoveRequest;
import com.chessonline.model.Game;
import com.chessonline.service.GameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
public class GameWebSocketController {

    @Autowired
    private GameService gameService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Make a move via WebSocket
     * Client sends: /app/game/{gameId}/move
     * Server broadcasts to both players: /topic/game/{gameId}/updates
     */
    @MessageMapping("/game/{gameId}/move")
    public void makeMove(
            @DestinationVariable String gameId,
            @Payload MakeMoveRequest request,
            Principal principal) {
        try {
            if (principal == null || principal.getName() == null) {
                throw new RuntimeException("Unauthorized WebSocket session");
            }
            UUID userId = UUID.fromString(principal.getName());
            
            System.out.println("🎮 Received move: " + request.getMove() + " from user: " + userId + " in game: " + gameId);
            
            // Execute move - makeMove() already sends WebSocket update internally
            gameService.makeMove(gameId, userId, request.getMove());
            
        } catch (Exception e) {
            System.err.println("❌ Error processing move: " + e.getMessage());
            // Send error only to current user
            if (principal != null && principal.getName() != null) {
                messagingTemplate.convertAndSendToUser(
                    principal.getName(),
                    "/queue/errors",
                    new ErrorMessage(e.getMessage())
                );
            }
        }
    }

    /**
     * Game subscription (client subscribes automatically to /topic/game/{gameId}/updates)
     */
    public void notifyGameUpdate(String gameId, Game game) {
        GameResponse response = mapGameToResponse(game);
        messagingTemplate.convertAndSend("/topic/game/" + gameId + "/updates", response);
    }

    private GameResponse mapGameToResponse(Game game) {
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
        response.setWhiteTimeLeftMs(gameService.getEffectiveTimeLeftMs(game, true));
        response.setBlackTimeLeftMs(gameService.getEffectiveTimeLeftMs(game, false));
        response.setLastMoveAt(game.getLastMoveAt());
        response.setCreatedAt(game.getCreatedAt());
        response.setFinishedAt(game.getFinishedAt());
        return response;
    }

    private static class ErrorMessage {
        private String message;

        public ErrorMessage(String message) {
            this.message = message;
        }
    }
}
