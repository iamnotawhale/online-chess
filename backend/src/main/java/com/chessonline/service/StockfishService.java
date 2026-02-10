package com.chessonline.service;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class StockfishService {
    private static final Logger logger = LoggerFactory.getLogger(StockfishService.class);
    private static final String STOCKFISH_COMMAND = "/usr/games/stockfish";
    private static final int DEFAULT_DEPTH = 20;
    private static final long TIMEOUT_SECONDS = 30;
    
    // Patterns for parsing Stockfish output
    private static final Pattern SCORE_CP_PATTERN = Pattern.compile("score cp (-?\\d+)");
    private static final Pattern SCORE_MATE_PATTERN = Pattern.compile("score mate (-?\\d+)");
    private static final Pattern BESTMOVE_PATTERN = Pattern.compile("bestmove ([a-h][1-8][a-h][1-8][qrbn]?)");

    public static class PositionEvaluation {
        private int evaluation;  // in centipawns (from white's perspective)
        private String bestMove; // in UCI format (e.g., "e2e4")
        private boolean isMate;
        private int mateIn;      // moves until mate (if isMate is true)

        public PositionEvaluation(int evaluation, String bestMove, boolean isMate, int mateIn) {
            this.evaluation = evaluation;
            this.bestMove = bestMove;
            this.isMate = isMate;
            this.mateIn = mateIn;
        }

        public int getEvaluation() { return evaluation; }
        public String getBestMove() { return bestMove; }
        public boolean isMate() { return isMate; }
        public int getMateIn() { return mateIn; }
    }

    /**
     * Analyze a chess position using Stockfish
     * @param fen Position in FEN notation
     * @param depth Analysis depth (default 20)
     * @return Position evaluation with best move
     */
    public PositionEvaluation analyzePosition(String fen, int depth) throws IOException, InterruptedException {
        if (depth <= 0) {
            depth = DEFAULT_DEPTH;
        }

        Process stockfish = null;
        BufferedReader reader = null;
        BufferedWriter writer = null;

        try {
            // Start Stockfish process
            logger.info("Starting Stockfish process with command: {}", STOCKFISH_COMMAND);
            ProcessBuilder pb = new ProcessBuilder(STOCKFISH_COMMAND);
            pb.redirectErrorStream(true);
            stockfish = pb.start();
            
            logger.info("Stockfish process started successfully");

            reader = new BufferedReader(new InputStreamReader(stockfish.getInputStream()));
            writer = new BufferedWriter(new OutputStreamWriter(stockfish.getOutputStream()));

            // Initialize UCI protocol
            sendCommand(writer, "uci");
            waitForResponse(reader, "uciok");

            sendCommand(writer, "isready");
            waitForResponse(reader, "readyok");

            // Set position and analyze
            sendCommand(writer, "position fen " + fen);
            sendCommand(writer, "go depth " + depth);

            // Parse analysis results
            String lastInfoLine = null;
            String bestMove = null;
            String line;

            while ((line = reader.readLine()) != null) {
                if (line.startsWith("info") && line.contains("score")) {
                    lastInfoLine = line;
                }
                if (line.startsWith("bestmove")) {
                    Matcher matcher = BESTMOVE_PATTERN.matcher(line);
                    if (matcher.find()) {
                        bestMove = matcher.group(1);
                    }
                    break;
                }
            }

            // Parse evaluation from last info line
            if (lastInfoLine != null && bestMove != null) {
                return parseEvaluation(lastInfoLine, bestMove);
            } else {
                logger.error("Failed to get evaluation for FEN: {}", fen);
                throw new IOException("Stockfish analysis failed - no evaluation received");
            }

        } finally {
            // Clean up resources
            if (writer != null) {
                try {
                    sendCommand(writer, "quit");
                    writer.close();
                } catch (IOException e) {
                    logger.warn("Error closing writer", e);
                }
            }
            if (reader != null) {
                try {
                    reader.close();
                } catch (IOException e) {
                    logger.warn("Error closing reader", e);
                }
            }
            if (stockfish != null) {
                try {
                    stockfish.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
                    if (stockfish.isAlive()) {
                        stockfish.destroyForcibly();
                    }
                } catch (InterruptedException e) {
                    stockfish.destroyForcibly();
                    Thread.currentThread().interrupt();
                }
            }
        }
    }

    private void sendCommand(BufferedWriter writer, String command) throws IOException {
        writer.write(command);
        writer.newLine();
        writer.flush();
        logger.debug("Sent to Stockfish: {}", command);
    }

    private void waitForResponse(BufferedReader reader, String expectedResponse) throws IOException {
        String line;
        while ((line = reader.readLine()) != null) {
            logger.debug("Received from Stockfish: {}", line);
            if (line.contains(expectedResponse)) {
                return;
            }
        }
        throw new IOException("Expected response not received: " + expectedResponse);
    }

    private PositionEvaluation parseEvaluation(String infoLine, String bestMove) {
        // Try to parse centipawn score
        Matcher cpMatcher = SCORE_CP_PATTERN.matcher(infoLine);
        if (cpMatcher.find()) {
            int evaluation = Integer.parseInt(cpMatcher.group(1));
            return new PositionEvaluation(evaluation, bestMove, false, 0);
        }

        // Try to parse mate score
        Matcher mateMatcher = SCORE_MATE_PATTERN.matcher(infoLine);
        if (mateMatcher.find()) {
            int mateIn = Integer.parseInt(mateMatcher.group(1));
            // Convert mate score to centipawns (very large value)
            int evaluation = mateIn > 0 ? 10000 : -10000;
            return new PositionEvaluation(evaluation, bestMove, true, mateIn);
        }

        logger.warn("Could not parse evaluation from: {}", infoLine);
        return new PositionEvaluation(0, bestMove, false, 0);
    }
}
