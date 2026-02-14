package com.chessonline.controller;

import com.chessonline.dto.CreateBotGameRequest;
import com.chessonline.dto.GameResponse;
import com.chessonline.model.BotDifficulty;
import com.chessonline.model.Game;
import com.chessonline.model.User;
import com.chessonline.service.BotService;
import com.chessonline.service.GameService;
import com.chessonline.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
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

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final UUID BOT_UUID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final String BOT_USERNAME = "StockfishBot";

    /**
     * Ensure bot player exists in database
     */
    private void ensureBotUserExists() {
        try {
            if (!userRepository.existsById(BOT_UUID)) {
                System.out.println("🤖 Creating bot user with ID: " + BOT_UUID);
                Instant now = Instant.now();
                String sql = "INSERT INTO users (id, username, email, password_hash, rating, created_at, updated_at) " +
                             "VALUES (cast(? as uuid), ?, ?, ?, ?, ?, ?)";
                
                int rowsAffected = jdbcTemplate.update(sql, 
                    BOT_UUID.toString(), 
                    BOT_USERNAME, 
                    "bot@chessonline.app", 
                    "", // empty password hash for bot
                    1600, // initial rating
                    now, 
                    now
                );
                
                if (rowsAffected > 0) {
                    System.out.println("✅ Bot user created successfully with " + rowsAffected + " row(s)");
                } else {
                    System.out.println("⚠️ Bot user creation returned 0 rows");
                }
            } else {
                System.out.println("✅ Bot user already exists");
            }
        } catch (Exception e) {
            System.err.println("⚠️ Error in ensureBotUserExists: " + e.getMessage());
            e.printStackTrace();
            // Continue anyway, maybe the user exists despite the error
        }
    }

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
     */
    @PostMapping("/game")
    public ResponseEntity<?> createBotGame(
            @RequestBody CreateBotGameRequest request,
            Authentication authentication) {
        try {
            System.out.println("🤖 Bot game request: " + request.getDifficulty() + ", " + request.getPlayerColor() + ", " + request.getTimeControl());
            
            if (authentication == null) {
                System.err.println("❌ Authentication is null!");
                return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
            }
            
            System.out.println("📍 Authentication details - Name: " + authentication.getName() + ", Authorities: " + authentication.getAuthorities());
            
            // Ensure bot player exists
            ensureBotUserExists();
            
            UUID playerId;
            try {
                playerId = UUID.fromString(authentication.getName());
                System.out.println("✅ Player ID: " + playerId);
            } catch (IllegalArgumentException e) {
                System.err.println("❌ Invalid player ID format: " + authentication.getName());
                return ResponseEntity.status(400).body(Map.of("error", "Invalid player ID format"));
            }
            
            // Check if player exists in database
            if (!userRepository.existsById(playerId)) {
                System.err.println("❌ Player not found in database: " + playerId);
                return ResponseEntity.status(400).body(Map.of("error", "Player not found in database"));
            }
            System.out.println("✅ Player exists in database");
            
            UUID botId = UUID.fromString(BotService.getBotPlayerId());
            
            String playerColor = request.getPlayerColor();
            
            // Randomize colors if requested
            if ("random".equalsIgnoreCase(playerColor)) {
                playerColor = new java.util.Random().nextBoolean() ? "white" : "black";
            }
            
            UUID whiteId = "white".equalsIgnoreCase(playerColor) ? playerId : botId;
            UUID blackId = "black".equalsIgnoreCase(playerColor) ? playerId : botId;
            
            System.out.println("⚪ White: " + whiteId + ", ⚫ Black: " + blackId);
            
            Game game = gameService.createGame(whiteId, blackId, request.getTimeControl(), null, false);
            GameResponse response = mapToResponse(game, 0);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            String errorMsg = "Bot game error: " + e.getClass().getSimpleName() + " - " + e.getMessage();
            System.err.println("❌ " + errorMsg);
            e.printStackTrace();
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", errorMsg);
            errorResponse.put("type", e.getClass().getSimpleName());
            return ResponseEntity.status(400).body(errorResponse);
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
