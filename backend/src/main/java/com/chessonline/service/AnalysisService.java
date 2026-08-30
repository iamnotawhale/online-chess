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
    private static final int BLUNDER_THRESHOLD = 300;      // 3.0 pawns - gross error
    private static final int MISTAKE_THRESHOLD = 100;      // 1.0 pawn - significant error
    private static final int INACCURACY_THRESHOLD = 50;    // 0.5 pawns - minor inaccuracy
    
    // Analysis parameters
    private static final int DEFAULT_DEPTH = 12;
    private static final int MIN_DEPTH = 5;
    private static final int MAX_DEPTH = 18;
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

            int whiteTotalCpl = 0;
            int blackTotalCpl = 0;

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
                    throw new MoveGeneratorException("Could not parse move: " + sanMove);
                }
                String playedUci = move.toString();
                board.doMove(move);

                // Check if game ended with this move (checkmate or stalemate)
                // Do not stop on claimable draws (threefold/50-move) since the game can continue.
                boolean gameEnded = board.isMated() || board.isStaleMate();
                
                // Get evaluation after the move
                String fenAfterMove = board.getFen();
                StockfishService.PositionEvaluation afterEval;
                
                if (gameEnded && board.isMated()) {
                    // For checkmate, set a mate evaluation from White's perspective (already converted)
                    // If white just moved and it's checkmate, black got mated (white wins) → +10000
                    // If black just moved and it's checkmate, white got mated (black wins) → -10000
                    int mateEval = isWhiteMove ? 10000 : -10000;
                    afterEval = new StockfishService.PositionEvaluation(mateEval, "", true, 0);
                    logger.info("Move {}{} {} - Checkmate! Winner: {}", 
                        moveNumber, isWhiteMove ? "." : "...", sanMove, isWhiteMove ? "White" : "Black");
                } else if (gameEnded) {
                    // Stalemate
                    afterEval = new StockfishService.PositionEvaluation(0, "", false, 0);
                    logger.info("Move {}{} {} - Game ended (stalemate)", 
                        moveNumber, isWhiteMove ? "." : "...", sanMove);
                } else {
                    // Normal position, analyze with Stockfish
                    afterEval = stockfishService.analyzePositionWithEngine(fenAfterMove, depth);
                    
                    // Log evaluation details for debugging
                    if (afterEval.isMate()) {
                        logger.info("Move {}{} {} - Mate score: mateIn={}, eval={}", 
                            moveNumber, isWhiteMove ? "." : "...", sanMove, 
                            afterEval.getMateIn(), afterEval.getEvaluation());
                    }
                }

                int displayEvaluation;
                if (gameEnded && board.isMated()) {
                    displayEvaluation = isWhiteMove ? 10000 : -10000;
                } else {
                    displayEvaluation = toWhitePerspective(afterEval.getEvaluation(), !isWhiteMove);
                }

                int displayBestEvaluation = toWhitePerspective(prevEval.getEvaluation(), isWhiteMove);

                MoveAnalysis analysis = new MoveAnalysis(
                    moveNumber,
                    isWhiteMove,
                    sanMove,
                    displayEvaluation,
                    prevEval.getBestMove()
                );
                analysis.setBestEvaluation(displayBestEvaluation);

                boolean isBestMove = playedUci.equalsIgnoreCase(prevEval.getBestMove());
                int centipawnLoss = 0;

                if (!afterEval.isMate() && !prevEval.isMate() && !isBestMove) {
                    int evalBeforeMover = prevEval.getEvaluation();
                    int evalAfterMover = -afterEval.getEvaluation();
                    centipawnLoss = Math.max(0, evalBeforeMover - evalAfterMover);

                    if (centipawnLoss >= BLUNDER_THRESHOLD) {
                        analysis.setBlunder(true);
                        if (isWhiteMove) whiteBlunders++; else blackBlunders++;
                    } else if (centipawnLoss >= MISTAKE_THRESHOLD) {
                        analysis.setMistake(true);
                        if (isWhiteMove) whiteMistakes++; else blackMistakes++;
                    } else if (centipawnLoss >= INACCURACY_THRESHOLD) {
                        analysis.setInaccuracy(true);
                        if (isWhiteMove) whiteInaccuracies++; else blackInaccuracies++;
                    }

                    if (isWhiteMove) {
                        whiteTotalCpl += centipawnLoss;
                    } else {
                        blackTotalCpl += centipawnLoss;
                    }
                }

                analysis.setCentipawnLoss(centipawnLoss);

                moveAnalyses.add(analysis);
                prevEval = afterEval;
                
                // Stop analysis if game ended
                if (gameEnded) {
                    logger.info("Analysis completed. Game ended after move {}.", sanMove);
                    break;
                }
                
                if (!isWhiteMove) {
                    moveNumber++;
                }

                long moveAnalysisTime = System.currentTimeMillis() - moveStartTime;
                logger.debug("Analyzed move {}: {} (cpl: {}cp, time: {}ms)", 
                            moveNumber, sanMove, centipawnLoss, moveAnalysisTime);
            }

            // Calculate accuracies
            int whiteMovesCount = (int) moveAnalyses.stream().filter(MoveAnalysis::isWhiteMove).count();
            int blackMovesCount = (int) moveAnalyses.stream().filter(m -> !m.isWhiteMove()).count();

            double whiteAccuracy = calculateAccuracyFromAcpl(whiteMovesCount, whiteTotalCpl);
            double blackAccuracy = calculateAccuracyFromAcpl(blackMovesCount, blackTotalCpl);

            // Build response
            AnalysisResponse response = new AnalysisResponse();
            response.setGameId(request.getGameId());
            response.setTotalMoves(moveAnalyses.size());
            response.setWhiteAccuracy(whiteAccuracy);
            response.setBlackAccuracy(blackAccuracy);
            response.setWhiteMistakes(whiteMistakes);
            response.setBlackMistakes(blackMistakes);
            response.setWhiteBlunders(whiteBlunders);
            response.setBlackBlunders(blackBlunders);
            response.setWhiteInaccuracies(whiteInaccuracies);
            response.setBlackInaccuracies(blackInaccuracies);
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
     * Convert Stockfish score (side-to-move POV) to white POV.
     */
    private int toWhitePerspective(int evalSideToMove, boolean whiteToMove) {
        return whiteToMove ? evalSideToMove : -evalSideToMove;
    }

    /**
     * Lichess-style accuracy from average centipawn loss (ACPL).
     */
    private double calculateAccuracyFromAcpl(int totalMoves, int totalCentipawnLoss) {
        if (totalMoves == 0) {
            return 100.0;
        }
        double acpl = (double) totalCentipawnLoss / totalMoves;
        double raw = 103.1668 * Math.exp(-0.04354 * acpl) - 3.1669;
        double accuracy = Math.max(0, Math.min(100, raw));
        return Math.round(accuracy * 10) / 10.0;
    }

    /**
     * Parse move string to Move object using current board position
     * Supports both SAN (e.g., "Nf3", "exd5") and UCI/coordinate notation (e.g., "e2e4", "g7g5")
     */
    private Move parseMove(Board board, String sanMove) {
        try {
            List<Move> legalMoves = board.legalMoves();
            String normalizedMove = sanMove == null ? "" : sanMove.trim();
            
            // Try direct UCI/coordinate match first (e.g., "e2e4")
            if (isUciLike(normalizedMove)) {
                String uciMove = normalizedMove.toLowerCase();
                for (Move move : legalMoves) {
                    if (move.toString().equals(uciMove)) {
                        return move;
                    }
                }
            }
            
            // Try SAN notation matching
            String cleanSan = normalizedMove.replaceAll("[+#!?]", ""); // Remove annotations
            
            for (Move move : legalMoves) {
                String moveStr = move.toString(); // UCI format
                
                // Try various matching strategies
                if (matchesSAN(cleanSan, moveStr, board) || 
                    matchesCoordinate(cleanSan, moveStr)) {
                    return move;
                }
            }
            
            logger.warn("No matching move found for: '{}' (board has {} legal moves)", 
                       normalizedMove, legalMoves.size());
            return null;
            
        } catch (Exception e) {
            logger.error("Error parsing move '{}': {}", sanMove, e.getMessage());
            return null;
        }
    }

    private boolean isUciLike(String move) {
        if (move == null || move.isEmpty()) {
            return false;
        }

        int length = move.length();
        if (length != 4 && length != 5) {
            return false;
        }

        boolean baseCoordinates = Character.isLetter(move.charAt(0))
                && Character.isDigit(move.charAt(1))
                && Character.isLetter(move.charAt(2))
                && Character.isDigit(move.charAt(3));

        if (!baseCoordinates) {
            return false;
        }

        if (length == 5) {
            return Character.isLetter(move.charAt(4));
        }

        return true;
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

        // Support UCI promotion moves (e.g., "e7e8q")
        if (move.length() == 5 && 
            Character.isLetter(move.charAt(0)) && 
            Character.isDigit(move.charAt(1)) &&
            Character.isLetter(move.charAt(2)) && 
            Character.isDigit(move.charAt(3)) &&
            Character.isLetter(move.charAt(4))) {
            
            return move.equalsIgnoreCase(uci);
        }

        return false;
    }
}
