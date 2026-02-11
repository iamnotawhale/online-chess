package com.chessonline.service;

import com.chessonline.dto.AnalysisRequest;
import com.chessonline.dto.AnalysisResponse;
import com.chessonline.dto.AnalysisResponse.MoveAnalysis;
import com.github.bhlangonijr.chesslib.Board;
import com.github.bhlangonijr.chesslib.move.Move;
import com.github.bhlangonijr.chesslib.move.MoveGeneratorException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class AnalysisService {
    private static final Logger logger = LoggerFactory.getLogger(AnalysisService.class);
    
    private final StockfishService stockfishService;

    // Threshold values in centipawns
    private static final int BLUNDER_THRESHOLD = 200;
    private static final int MISTAKE_THRESHOLD = 50;
    private static final int INACCURACY_THRESHOLD = 20;
    
    // Analysis parameters
    private static final int DEFAULT_DEPTH = 8; // Reduced from 10 for faster analysis (3-4x faster per position)
    private static final int MIN_DEPTH = 5;
    private static final int MAX_DEPTH = 15;
    private static final int MAX_GAME_LENGTH_FOR_ANALYSIS = 200; // No hard limit, allow full games

    public AnalysisService(StockfishService stockfishService) {
        this.stockfishService = stockfishService;
    }

    /**
     * Analyze a complete game
     * @param request Analysis request with game ID, moves, starting position, and depth
     * @return Complete game analysis with move evaluations and accuracy metrics
     */
    public AnalysisResponse analyzeGame(AnalysisRequest request) throws IOException, InterruptedException, MoveGeneratorException {
        long startTime = System.currentTimeMillis();
        logger.info("Starting analysis for game: {} with {} moves", request.getGameId(), request.getMoves().size());
        
        // Validate and limit analysis parameters
        int depth = validateDepth(request.getDepth());
        List<String> moves = request.getMoves();
        
        // Validate game length
        if (moves.size() > MAX_GAME_LENGTH_FOR_ANALYSIS) {
            logger.warn("Game {} has {} moves, limiting to {} for analysis", 
                       request.getGameId(), moves.size(), MAX_GAME_LENGTH_FOR_ANALYSIS);
            moves = moves.subList(0, MAX_GAME_LENGTH_FOR_ANALYSIS);
        }

        // Start persistent Stockfish engine
        stockfishService.startEngine();
        
        try {
            Board board = new Board();
            if (request.getStartFen() != null && !request.getStartFen().isEmpty()) {
                board.loadFromFen(request.getStartFen());
            }

            List<MoveAnalysis> moveAnalyses = new ArrayList<>();
            int whiteMistakes = 0, whiteBlunders = 0, whiteInaccuracies = 0;
            int blackMistakes = 0, blackBlunders = 0, blackInaccuracies = 0;

            StockfishService.PositionEvaluation prevEval = null;
            int moveNumber = 1;

            for (String sanMove : moves) {
                long moveStartTime = System.currentTimeMillis();
                boolean isWhiteMove = board.getSideToMove().name().equals("WHITE");
                
                // Get evaluation before the move
                String fenBeforeMove = board.getFen();
                if (prevEval == null) {
                    // First move - analyze starting position
                    prevEval = stockfishService.analyzePositionWithEngine(fenBeforeMove, depth);
                }

                // Make the move
                Move move = parseMove(board, sanMove);
                if (move == null) {
                    logger.error("Could not parse move: {}", sanMove);
                    continue;
                }
                board.doMove(move);

                // Get evaluation after the move
                String fenAfterMove = board.getFen();
                StockfishService.PositionEvaluation afterEval = stockfishService.analyzePositionWithEngine(fenAfterMove, depth);

                // Calculate evaluation loss/gain (from perspective of player who made the move)
                int evaluationDelta = calculateEvaluationDelta(prevEval.getEvaluation(), 
                                                               afterEval.getEvaluation(), 
                                                               isWhiteMove);

                // Create move analysis
                MoveAnalysis analysis = new MoveAnalysis(
                    moveNumber,
                    isWhiteMove,
                    sanMove,
                    afterEval.getEvaluation(),
                    prevEval.getBestMove()
                );
                analysis.setBestEvaluation(prevEval.getEvaluation());

                // Classify the move
                if (evaluationDelta >= BLUNDER_THRESHOLD) {
                    analysis.setBlunder(true);
                    if (isWhiteMove) whiteBlunders++; else blackBlunders++;
                } else if (evaluationDelta >= MISTAKE_THRESHOLD) {
                    analysis.setMistake(true);
                    if (isWhiteMove) whiteMistakes++; else blackMistakes++;
                } else if (evaluationDelta >= INACCURACY_THRESHOLD) {
                    analysis.setInaccuracy(true);
                    if (isWhiteMove) whiteInaccuracies++; else blackInaccuracies++;
                }

                moveAnalyses.add(analysis);
                prevEval = afterEval;
                
                if (!isWhiteMove) {
                    moveNumber++;
                }

                long moveAnalysisTime = System.currentTimeMillis() - moveStartTime;
                logger.debug("Analyzed move {}: {} (delta: {}cp, time: {}ms)", 
                            moveNumber, sanMove, evaluationDelta, moveAnalysisTime);
            }

            // Calculate accuracies
            int whiteMovesCount = (int) moveAnalyses.stream().filter(MoveAnalysis::isWhiteMove).count();
            int blackMovesCount = (int) moveAnalyses.stream().filter(m -> !m.isWhiteMove()).count();

            double whiteAccuracy = calculateAccuracy(whiteMovesCount, whiteInaccuracies, whiteMistakes, whiteBlunders);
            double blackAccuracy = calculateAccuracy(blackMovesCount, blackInaccuracies, blackMistakes, blackBlunders);

            // Build response
            AnalysisResponse response = new AnalysisResponse();
            response.setGameId(request.getGameId());
            response.setTotalMoves(moves.size());
            response.setWhiteAccuracy(whiteAccuracy);
            response.setBlackAccuracy(blackAccuracy);
            response.setWhiteMistakes(whiteMistakes);
            response.setBlackMistakes(blackMistakes);
            response.setWhiteBlunders(whiteBlunders);
            response.setBlackBlunders(blackBlunders);
            response.setMoves(moveAnalyses);

            long totalTime = System.currentTimeMillis() - startTime;
            logger.info("Analysis completed for game: {} (White: {}%, Black: {}%, time: {}ms)", 
                       request.getGameId(), (int) whiteAccuracy, (int) blackAccuracy, totalTime);
            
            return response;
        } finally {
            // Always stop the engine
            stockfishService.stopEngine();
        }
    }
    
    /**
     * Validate and constrain analysis depth
     */
    private int validateDepth(Integer requestedDepth) {
        if (requestedDepth == null) {
            return DEFAULT_DEPTH;
        }
        
        int depth = Math.max(MIN_DEPTH, Math.min(requestedDepth, MAX_DEPTH));
        
        if (depth != requestedDepth) {
            logger.warn("Depth {} adjusted to {} (valid range: {}-{})", 
                       requestedDepth, depth, MIN_DEPTH, MAX_DEPTH);
        }
        
        return depth;
    }

    /**
     * Calculate evaluation delta - how much the position worsened from player's perspective
     */
    private int calculateEvaluationDelta(int evalBefore, int evalAfter, boolean isWhiteMove) {
        int delta;
        if (isWhiteMove) {
            // White wants evaluation to increase
            delta = evalBefore - evalAfter;
        } else {
            // Black wants evaluation to decrease
            delta = evalAfter - evalBefore;
        }
        return Math.max(0, delta); // Only count negative changes as mistakes
    }

    /**
     * Calculate accuracy percentage based on move quality
     * Formula: 100% - penalties for inaccuracies, mistakes, and blunders
     */
    private double calculateAccuracy(int totalMoves, int inaccuracies, int mistakes, int blunders) {
        if (totalMoves == 0) return 100.0;
        
        // Weight penalties: inaccuracy = 2%, mistake = 5%, blunder = 10%
        double penalty = (inaccuracies * 2.0 + mistakes * 5.0 + blunders * 10.0) / totalMoves;
        double accuracy = Math.max(0, 100.0 - penalty);
        
        return Math.round(accuracy * 10) / 10.0; // Round to 1 decimal place
    }

    /**
     * Parse move string to Move object using current board position
     * Supports both SAN (e.g., "Nf3", "exd5") and UCI/coordinate notation (e.g., "e2e4", "g7g5")
     */
    private Move parseMove(Board board, String sanMove) {
        try {
            List<Move> legalMoves = board.legalMoves();
            
            // Try direct UCI/coordinate match first (e.g., "e2e4")
            if (sanMove.length() == 4 && Character.isLetter(sanMove.charAt(0))) {
                String uciMove = sanMove.toLowerCase();
                for (Move move : legalMoves) {
                    if (move.toString().equals(uciMove)) {
                        return move;
                    }
                }
            }
            
            // Try SAN notation matching
            String cleanSan = sanMove.replaceAll("[+#!?]", ""); // Remove annotations
            
            for (Move move : legalMoves) {
                String moveStr = move.toString(); // UCI format
                
                // Try various matching strategies
                if (matchesSAN(cleanSan, moveStr, board) || 
                    matchesCoordinate(cleanSan, moveStr)) {
                    return move;
                }
            }
            
            logger.warn("No matching move found for: '{}' (board has {} legal moves)", 
                       sanMove, legalMoves.size());
            return null;
            
        } catch (Exception e) {
            logger.error("Error parsing move '{}': {}", sanMove, e.getMessage());
            return null;
        }
    }
    
    /**
     * Match SAN notation with UCI move string
     */
    private boolean matchesSAN(String san, String uci, Board board) {
        // Handle castling
        if (san.equals("O-O") || san.equals("0-0")) {
            return uci.equals("e1g1") || uci.equals("e8g8");
        }
        if (san.equals("O-O-O") || san.equals("0-0-0")) {
            return uci.equals("e1c1") || uci.equals("e8c8");
        }
        
        // Extract destination square from SAN (last 2 chars before promotion)
        String dest;
        if (san.length() >= 2) {
            if (san.contains("=")) {
                int eqIndex = san.indexOf("=");
                dest = san.substring(eqIndex - 2, eqIndex);
            } else {
                dest = san.substring(san.length() - 2);
            }
            
            // Check if UCI move ends with destination
            if (uci.length() >= 4 && uci.substring(2, 4).equals(dest)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Match coordinate notation (e.g., "e2e4" or "g7g5")
     */
    private boolean matchesCoordinate(String move, String uci) {
        // If move is 4 chars and looks like coordinates (letter-digit-letter-digit)
        if (move.length() == 4 && 
            Character.isLetter(move.charAt(0)) && 
            Character.isDigit(move.charAt(1)) &&
            Character.isLetter(move.charAt(2)) && 
            Character.isDigit(move.charAt(3))) {
            
            return move.equalsIgnoreCase(uci);
        }
        return false;
    }
}
