package com.chessonline.service;

import com.chessonline.model.Game;
import com.chessonline.model.BotDifficulty;
import com.chessonline.repository.GameRepository;
import com.github.bhlangonijr.chesslib.Board;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Random;

@Service
public class BotService {
    private static final Logger logger = LoggerFactory.getLogger(BotService.class);
    
    // Fixed UUID for CPU bot player
    private static final String BOT_PLAYER_ID = "00000000-0000-0000-0000-000000000001";
    
    @Autowired
    private StockfishService stockfishService;
    
    @Autowired
    private GameService gameService;
    
    @Autowired
    private GameRepository gameRepository;

    /**
     * Get bot's next move
     * @param gameId Game ID
     * @param difficulty Bot difficulty level
     * @return UCI move string (e.g., "e2e4")
     */
    public String getBotMove(String gameId, BotDifficulty difficulty) throws Exception {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found: " + gameId));
        
        String currentFen = game.getFenCurrent();
        if (currentFen == null || currentFen.isEmpty()) {
            currentFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        }
        
        logger.info("Getting bot move for game {} at difficulty {}", gameId, difficulty);
        
        // Analyze position with Stockfish
        StockfishService.PositionEvaluation evaluation = analyzePosition(currentFen, difficulty);
        
        String botMove = evaluation.getBestMove();
        if (botMove == null || botMove.isEmpty()) {
            logger.warn("Stockfish returned no best move, using first legal move");
            botMove = getFirstLegalMove(currentFen);
        }
        
        // Add random delay to simulate thinking (100-500ms)
        long thinkingDelay = 100 + new Random().nextInt(400);
        Thread.sleep(thinkingDelay);
        
        logger.info("Bot move: {} (evaluation: {})", botMove, evaluation.getEvaluation());
        return botMove;
    }

    /**
     * Analyze position using Stockfish
     */
    private StockfishService.PositionEvaluation analyzePosition(String fen, BotDifficulty difficulty) throws Exception {
        stockfishService.startEngine();
        try {
            return stockfishService.analyzePositionWithEngine(fen, difficulty.getDepth());
        } finally {
            stockfishService.stopEngine();
        }
    }

    /**
     * Get first legal move if Stockfish fails
     */
    private String getFirstLegalMove(String fen) {
        try {
            Board board = new Board();
            board.loadFromFen(fen);
            
            // Return any legal move in UCI format
            var moves = board.legalMoves();
            if (!moves.isEmpty()) {
                var move = moves.get(0);
                return move.getFrom().toString().toLowerCase() + move.getTo().toString().toLowerCase();
            }
            return "e2e4"; // Fallback
        } catch (Exception e) {
            logger.warn("Could not get legal move", e);
            return "e2e4";
        }
    }

    /**
     * Get bot player ID (fixed UUID for CPU)
     */
    public static String getBotPlayerId() {
        return BOT_PLAYER_ID;
    }
}
