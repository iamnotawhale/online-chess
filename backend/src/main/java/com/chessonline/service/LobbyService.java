package com.chessonline.service;

import com.chessonline.dto.CreateLobbyGameRequest;
import com.chessonline.dto.LobbyGameResponse;
import com.chessonline.model.LobbyGame;
import com.chessonline.model.User;
import com.chessonline.repository.LobbyGameRepository;
import com.chessonline.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class LobbyService {
    @Autowired
    private LobbyGameRepository lobbyGameRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GameService gameService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public LobbyGameResponse createLobbyGame(UUID userId, CreateLobbyGameRequest request) {
        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        LobbyGame lobbyGame = new LobbyGame(
                creator,
                request.getGameMode(),
                request.getTimeControl(),
                request.getPreferredColor(),
                request.isRated()
        );

        lobbyGame = lobbyGameRepository.save(lobbyGame);
        return toLobbyGameResponse(lobbyGame);
    }

    public List<LobbyGameResponse> getAllLobbyGames() {
        return lobbyGameRepository.findAll()
                .stream()
                .map(this::toLobbyGameResponse)
                .collect(Collectors.toList());
    }

    public LobbyGameResponse getLobbyGame(UUID gameId) {
        LobbyGame lobbyGame = lobbyGameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Lobby game not found"));
        return toLobbyGameResponse(lobbyGame);
    }

    public String joinLobbyGame(UUID gameId, UUID opponentId) {
        LobbyGame lobbyGame = lobbyGameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Lobby game not found"));

        User creator = lobbyGame.getCreator();
        User opponent = userRepository.findById(opponentId)
                .orElseThrow(() -> new RuntimeException("Opponent not found"));

        // Check rating compatibility for matchmaking games (non-custom)
        if (!"custom".equals(lobbyGame.getGameMode())) {
            int ratingDiff = Math.abs(creator.getRating() - opponent.getRating());
            int maxRatingDiff = 200; // Allow up to 200 rating point difference for matchmaking games
            if (ratingDiff > maxRatingDiff) {
                throw new RuntimeException("Rating difference too large for this game");
            }
        }

        // Assign colors based on creator's preference
        UUID whiteId, blackId;
        if ("white".equals(lobbyGame.getPreferredColor())) {
            whiteId = creator.getId();
            blackId = opponent.getId();
        } else if ("black".equals(lobbyGame.getPreferredColor())) {
            whiteId = opponent.getId();
            blackId = creator.getId();
        } else {
            // Random - creator is white in lobby games
            whiteId = creator.getId();
            blackId = opponent.getId();
        }

        // Create the game - use isRated field from lobbyGame
        com.chessonline.model.Game game = gameService.createGame(
                whiteId,
                blackId,
                lobbyGame.getTimeControl(),
                null,
                lobbyGame.isRated()
        );

        // Delete the lobby game after creation
        lobbyGameRepository.delete(lobbyGame);
        
        // Notify both players that game has started via WebSocket
        Map<String, Object> gameStartedMessage = Map.of(
            "gameId", game.getId(),
            "message", "Игра началась"
        );
        
        // Send to creator
        messagingTemplate.convertAndSendToUser(
                creator.getId().toString(),
                "/queue/game-started",
                gameStartedMessage
        );
        
        // Send to opponent (the one who joined)
        messagingTemplate.convertAndSendToUser(
                opponent.getId().toString(),
                "/queue/game-started",
                gameStartedMessage
        );

        return game.getId();
    }

    public void cancelLobbyGame(UUID gameId, UUID userId) {
        LobbyGame lobbyGame = lobbyGameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Lobby game not found"));

        if (!lobbyGame.getCreator().getId().equals(userId)) {
            throw new RuntimeException("Only the creator can cancel the lobby game");
        }

        lobbyGameRepository.delete(lobbyGame);
    }

    private LobbyGameResponse toLobbyGameResponse(LobbyGame lobbyGame) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        return new LobbyGameResponse(
                lobbyGame.getId(),
                lobbyGame.getCreator().getId(),
                lobbyGame.getCreator().getUsername(),
                lobbyGame.getCreator().getRating(),
                lobbyGame.getGameMode(),
                lobbyGame.getTimeControl(),
                lobbyGame.getPreferredColor(),
                lobbyGame.isRated(),
                lobbyGame.getCreatedAt().format(formatter)
        );
    }

    @Scheduled(fixedRate = 60000) // Run every 60 seconds
    public void cleanupExpiredLobbyGames() {
        LocalDateTime twentyMinutesAgo = LocalDateTime.now().minusMinutes(20);
        List<LobbyGame> expiredGames = lobbyGameRepository.findAll()
                .stream()
                .filter(game -> game.getCreatedAt().isBefore(twentyMinutesAgo))
                .collect(Collectors.toList());

        if (!expiredGames.isEmpty()) {
            lobbyGameRepository.deleteAll(expiredGames);
        }
    }
}
