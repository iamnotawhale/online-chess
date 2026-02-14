package com.chessonline.controller;

import com.chessonline.dto.GameResponse;
import com.chessonline.model.BotDifficulty;
import com.chessonline.model.Game;
import com.chessonline.service.BotService;
import com.chessonline.service.GameService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bot")
public class BotController {
    
    @Autowired
    private GameService gameService;
    
    @Autowired
    private BotService botService;

    /**
     * Get available bot difficulty levels
     */
    @GetMapping("/difficulties")
    public ResponseEntity<List<Map<String, Object>>> getDifficulties() {
        List<Map<String, Object>> difficulties = Arrays.stream(BotDifficulty.values())
            .map(d -> {
                Map<String, Object> map = new HashMap<>();
                map.put("name", d.name());
                map.put("depth", d.getDepth());
                return map;
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(difficulties);
    }

    /**
     * Create a new game against bot
     * @param difficulty Bot difficulty level
     * @param playerColor Player's color: 'white', 'black', or 'random'
     * @param timeControl Time control (e.g., "5+3")
     */
    @PostMapping("/game")
    public ResponseEntity<?> createBotGame(
            @RequestParam BotDifficulty difficulty,
            @RequestParam(defaultValue = "random") String playerColor,
            @RequestParam(defaultValue = "5+3") String timeControl,
            Authentication authentication) {
        try {
            UUID playerId = UUID.fromString(authentication.getName());
            UUID botId = UUID.fromString(BotService.getBotPlayerId());
            
            // Randomize colors if requested
            if ("random".equalsIgnoreCase(playerColor)) {
                playerColor = new java.util.Random().nextBoolean() ? "white" : "black";
            }
            
            UUID whiteId = "white".equalsIgnoreCase(playerColor) ? playerId : botId;
            UUID blackId = "black".equalsIgnoreCase(playerColor) ? playerId : botId;
            
            Game game = gameService.createGame(whiteId, blackId, timeControl, null, false);
            GameResponse response = mapToResponse(game, 0);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get bot's next move
     * @param gameId Game ID
     * @param difficulty Bot difficulty for analysis
     */
    @PostMapping("/move/{gameId}")
    public ResponseEntity<?> getBotMove(
            @PathVariable String gameId,
            @RequestParam(defaultValue = "INTERMEDIATE") BotDifficulty difficulty,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            
            // Verify user is in the game
            var game = gameService.getGame(gameId, userId);
            if (game.isEmpty()) {
                return ResponseEntity.status(403).body(Map.of("error", "Not authorized to view this game"));
            }
            
            // Get bot move
            String botMoveUci = botService.getBotMove(gameId, difficulty);
            
            // Apply bot move to game
            UUID botId = UUID.fromString(BotService.getBotPlayerId());
            var move = gameService.makeMove(gameId, botId, botMoveUci);
            
            // Get updated game state
            Game updatedGame = gameService.getGame(gameId, userId).get();
            GameResponse gameResponse = mapToResponse(updatedGame, 0);
            
            return ResponseEntity.ok(Map.of(
                "move", botMoveUci,
                "game", gameResponse
            ));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Map Game entity to GameResponse DTO
     */
    private GameResponse mapToResponse(Game game, int moveCount) {
        GameResponse response = new GameResponse();
        response.setId(game.getId());
        response.setWhitePlayerId(game.getPlayerWhite().getId());
        response.setBlackPlayerId(game.getPlayerBlack().getId());
        response.setWhiteUsername(game.getPlayerWhite().getUsername());
        response.setBlackUsername(game.getPlayerBlack().getUsername());
        response.setStatus(game.getStatus());
        response.setResult(game.getResult());
        response.setResultReason(game.getResultReason());
        response.setFenCurrent(game.getFenCurrent());
        response.setTimeControl(game.getTimeControl());
        response.setRated(game.isRated());
        response.setWhiteTimeLeftMs(game.getWhiteTimeLeftMs());
        response.setBlackTimeLeftMs(game.getBlackTimeLeftMs());
        if (game.getDrawOfferedBy() != null) {
            response.setDrawOfferedById(game.getDrawOfferedBy().getId());
        }
        response.setLastMoveAt(game.getLastMoveAt());
        return response;
    }
}
