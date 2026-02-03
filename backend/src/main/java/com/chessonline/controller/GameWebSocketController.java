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
     * Сделать ход через WebSocket
     * Клиент отправляет: /app/game/{gameId}/move
     * Сервер отправляет обоим игрокам: /topic/game/{gameId}/updates
     */
    @MessageMapping("/game/{gameId}/move")
    public void makeMove(
            @DestinationVariable UUID gameId,
            @Payload MakeMoveRequest request,
            Principal principal) {
        try {
            UUID userId = UUID.fromString(principal.getName());
            
            // Делаем ход (возвращает Move, а не Game)
            gameService.makeMove(gameId, userId, request.getMove());
            
            // Получаем обновленную игру
            Game game = gameService.getGame(gameId, userId)
                    .orElseThrow(() -> new RuntimeException("Game not found"));
            
            // Отправляем обновление всем подписанным на эту игру
            GameResponse response = mapGameToResponse(game);
            messagingTemplate.convertAndSend("/topic/game/" + gameId + "/updates", response);
            
        } catch (Exception e) {
            // Отправляем ошибку конкретному пользователю
            messagingTemplate.convertAndSendToUser(
                principal.getName(),
                "/queue/errors",
                new ErrorMessage(e.getMessage())
            );
        }
    }

    /**
     * Подписка на игру (клиент автоматически подписывается на /topic/game/{gameId}/updates)
     */
    public void notifyGameUpdate(UUID gameId, Game game) {
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
        response.setWhiteTimeLeftMs(game.getWhiteTimeLeftMs());
        response.setBlackTimeLeftMs(game.getBlackTimeLeftMs());
        response.setCreatedAt(game.getCreatedAt());
        response.setFinishedAt(game.getFinishedAt());
        return response;
    }

    private static class ErrorMessage {
        private String message;

        public ErrorMessage(String message) {
            this.message = message;
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }
}
