package com.chessonline.controller;

import com.chessonline.dto.GameResponse;
import com.chessonline.dto.MakeMoveRequest;
import com.chessonline.dto.MoveResponse;
import com.chessonline.model.Game;
import com.chessonline.model.Move;
import com.chessonline.model.RatingHistory;
import com.chessonline.repository.RatingHistoryRepository;
import com.chessonline.service.GameService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/games")
public class GameController {

    @Autowired
    private GameService gameService;

    @Autowired
    private RatingHistoryRepository ratingHistoryRepository;

    /**
     * Create a new game
     */
    @PostMapping
    public ResponseEntity<?> createGame(
            @RequestParam UUID opponentId,
            @RequestParam(defaultValue = "5+3") String timeControl,
            @RequestParam(required = false) String inviteCode,
            @RequestParam(defaultValue = "true") boolean rated,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            
            // TODO: Implement invite lookup when creating game
            Game game = gameService.createGame(userId, opponentId, timeControl, null, rated);
            
            GameResponse response = mapToResponse(game, 0);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get game by ID
     */
    @GetMapping("/{gameId}")
    public ResponseEntity<?> getGame(
            @PathVariable String gameId,
            @RequestParam(required = false) UUID userId,
            Authentication authentication) {
        try {
            UUID requestUserId = userId;
            if (requestUserId == null && authentication != null) {
                requestUserId = UUID.fromString(authentication.getName());
            }

            Optional<Game> gameOpt;
            if (requestUserId != null) {
                gameOpt = gameService.getGame(gameId, requestUserId);
            } else {
                gameOpt = gameService.getGamePublic(gameId);
            }

            if (gameOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Game not found"));
            }

            Game game = gameOpt.get();
            List<Move> moves = gameService.getGameMoves(gameId);
            GameResponse response = mapToResponse(game, moves.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get all games for current user
     */
    @GetMapping
    public ResponseEntity<?> getMyGames(Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            List<Game> games = gameService.getUserActiveGames(userId);
            List<GameResponse> responses = games.stream()
                    .map(game -> mapToResponse(game, 0))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Make a move
     */
    @PostMapping("/{gameId}/moves")
    public ResponseEntity<?> makeMove(
            @PathVariable String gameId,
            @Valid @RequestBody MakeMoveRequest request,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            Move move = gameService.makeMove(gameId, userId, request.getMove());

            MoveResponse response = mapMoveToResponse(move);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Resign from game
     */
    @PostMapping("/{gameId}/resign")
    public ResponseEntity<?> resign(
            @PathVariable String gameId,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            Game game = gameService.resign(gameId, userId);

            List<Move> moves = gameService.getGameMoves(gameId);
            GameResponse response = mapToResponse(game, moves.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Abandon game
     */
    @PostMapping("/{gameId}/abandon")
    public ResponseEntity<?> abandon(
            @PathVariable String gameId,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            Game game = gameService.abandon(gameId, userId);

            List<Move> moves = gameService.getGameMoves(gameId);
            GameResponse response = mapToResponse(game, moves.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get moves for a game
     */
    @GetMapping("/{gameId}/moves")
    public ResponseEntity<?> getMoves(@PathVariable String gameId) {
        try {
            List<Move> moves = gameService.getGameMoves(gameId);
            List<MoveResponse> responses = moves.stream()
                    .map(this::mapMoveToResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get PGN for a game
     */
    @GetMapping("/{gameId}/pgn")
    public ResponseEntity<?> getPGN(@PathVariable String gameId) {
        try {
            String pgn = gameService.generatePGN(gameId);
            return ResponseEntity.ok(Map.of("pgn", pgn));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get user's active games
     */
    @GetMapping("/my/active")
    public ResponseEntity<?> getMyActiveGames(Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            List<Game> games = gameService.getUserActiveGames(userId);
            List<GameResponse> responses = games.stream()
                    .map(g -> mapToResponse(g, 0))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/my/finished")
    public ResponseEntity<?> getMyFinishedGames(Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            List<Game> games = gameService.getUserFinishedGames(userId);
            List<GameResponse> responses = games.stream()
                    .map(g -> mapToResponseWithRating(g, 0, userId))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{gameId}/offer-draw")
    public ResponseEntity<?> offerDraw(@PathVariable String gameId, Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            gameService.offerDraw(gameId, userId);
            return ResponseEntity.ok(Map.of("message", "Draw offered"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{gameId}/respond-draw")
    public ResponseEntity<?> respondToDraw(
            @PathVariable String gameId,
            @RequestParam boolean accept,
            Authentication authentication) {
        try {
            UUID userId = UUID.fromString(authentication.getName());
            gameService.respondToDraw(gameId, userId, accept);
            return ResponseEntity.ok(Map.of("message", accept ? "Draw accepted" : "Draw declined"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // Helper methods
    private GameResponse mapToResponse(Game game, int moveCount) {
        return mapToResponseWithRating(game, moveCount, null);
    }

    private GameResponse mapToResponseWithRating(Game game, int moveCount, UUID userId) {
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
        response.setRated(game.isRated());
        response.setFenCurrent(game.getFenCurrent());
        response.setWhiteTimeLeftMs(gameService.getEffectiveTimeLeftMs(game, true));
        response.setBlackTimeLeftMs(gameService.getEffectiveTimeLeftMs(game, false));
        response.setLastMoveAt(game.getLastMoveAt());
        response.setMoveCount(moveCount);
        response.setCreatedAt(game.getCreatedAt());
        response.setFinishedAt(game.getFinishedAt());
        response.setDrawOfferedById(game.getDrawOfferedBy() != null ? game.getDrawOfferedBy().getId() : null);

        // Add rating change if userId is provided and game is finished
        if (userId != null && "finished".equals(game.getStatus())) {
            RatingHistory ratingHistory = ratingHistoryRepository.findByGameIdAndUserId(game.getId(), userId);
            if (ratingHistory != null) {
                response.setRatingChange(ratingHistory.getRatingChange());
            }
        }

        return response;
    }

    private MoveResponse mapMoveToResponse(Move move) {
        MoveResponse response = new MoveResponse();
        response.setId(move.getId());
        response.setMoveNumber(move.getMoveNumber());
        response.setSan(move.getSan());
        response.setFen(move.getFen());
        response.setTimeLeftMs(move.getTimeLeftMs());
        response.setCreatedAt(move.getCreatedAt());
        return response;
    }
}
