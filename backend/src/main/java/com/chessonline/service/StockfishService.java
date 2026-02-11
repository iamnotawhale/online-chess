package com.chessonline.service;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.*;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeoutException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class StockfishService {
    private static final Logger logger = LoggerFactory.getLogger(StockfishService.class);
    private static final String STOCKFISH_COMMAND = "/usr/games/stockfish";
    private static final int DEFAULT_DEPTH = 20;
    private static final long TIMEOUT_SECONDS = 30;
    private static final long ANALYSIS_TIMEOUT_SECONDS = 20; // Timeout per position analysis
    
    // Thread-local storage for persistent Stockfish process
    private final ThreadLocal<Process> processHolder = new ThreadLocal<>();
    private final ThreadLocal<BufferedReader> readerHolder = new ThreadLocal<>();
    private final ThreadLocal<BufferedWriter> writerHolder = new ThreadLocal<>();
    private final ThreadLocal<ExecutorService> executorHolder = new ThreadLocal<>();
    
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
     * Start a persistent Stockfish engine for multiple analyses
     * Must call stopEngine() when done
     */
    public synchronized void startEngine() throws IOException {
        if (processHolder.get() != null) {
            logger.debug("Stockfish engine already running");
            return;
        }

        logger.info("Starting persistent Stockfish engine");
        ProcessBuilder pb = new ProcessBuilder(STOCKFISH_COMMAND);
        pb.redirectErrorStream(true);
        Process stockfish = pb.start();
        
        BufferedReader reader = new BufferedReader(new InputStreamReader(stockfish.getInputStream()));
        BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(stockfish.getOutputStream()));
        ExecutorService executor = Executors.newSingleThreadExecutor();

        try {
            // Initialize UCI protocol
            sendCommand(writer, "uci");
            waitForResponse(reader, "uciok", executor);

            sendCommand(writer, "isready");
            waitForResponse(reader, "readyok", executor);
            
            processHolder.set(stockfish);
            readerHolder.set(reader);
            writerHolder.set(writer);
            executorHolder.set(executor);
            logger.info("Stockfish engine started and initialized successfully");
        } catch (IOException | InterruptedException e) {
            reader.close();
            writer.close();
            executor.shutdownNow();
            stockfish.destroyForcibly();
            throw new IOException("Failed to start Stockfish engine", e);
        }
    }

    /**
     * Stop the persistent Stockfish engine
     */
    public synchronized void stopEngine() {
        Process stockfish = processHolder.get();
        BufferedWriter writer = writerHolder.get();
        BufferedReader reader = readerHolder.get();
        ExecutorService executor = executorHolder.get();

        if (stockfish == null) {
            return;
        }

        try {
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
            if (executor != null) {
                executor.shutdownNow();
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
            logger.info("Stockfish engine stopped");
        } finally {
            processHolder.remove();
            readerHolder.remove();
            writerHolder.remove();
            executorHolder.remove();
        }
    }

    /**
     * Analyze a position using persistent engine (must call startEngine first)
     */
    public synchronized PositionEvaluation analyzePositionWithEngine(String fen, int depth) throws IOException, InterruptedException {
        BufferedReader reader = readerHolder.get();
        BufferedWriter writer = writerHolder.get();
        ExecutorService executor = executorHolder.get();

        if (reader == null || writer == null) {
            throw new IllegalStateException("Engine not started. Call startEngine() first");
        }

        if (depth <= 0) {
            depth = DEFAULT_DEPTH;
        }

        long analysisStart = System.currentTimeMillis();
        logger.debug("Analyzing position at depth {}", depth);
        
        // Set position and analyze
        sendCommand(writer, "position fen " + fen);
        sendCommand(writer, "go depth " + depth);

        // Parse analysis results with timeout
        String lastInfoLine = null;
        String bestMove = null;
        
        try {
            while (true) {
                // Read line with timeout
                Future<String> lineFuture = executor.submit(reader::readLine);
                String line = lineFuture.get(ANALYSIS_TIMEOUT_SECONDS, TimeUnit.SECONDS);
                
                if (line == null) {
                    break; // EOF
                }
                
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
        } catch (TimeoutException e) {
            logger.error("Stockfish analysis timeout after {} seconds for FEN: {}", ANALYSIS_TIMEOUT_SECONDS, fen);
            throw new IOException("Stockfish analysis timeout - position too complex or engine hung");
        } catch (java.util.concurrent.ExecutionException e) {
            logger.error("Stockfish analysis execution error for FEN: {}", fen, e);
            throw new IOException("Stockfish analysis execution error", e);
        }

        long analysisDuration = System.currentTimeMillis() - analysisStart;
        logger.debug("Position analysis completed in {}ms", analysisDuration);

        // Parse evaluation from last info line
        if (lastInfoLine != null && bestMove != null) {
            return parseEvaluation(lastInfoLine, bestMove);
        } else {
            logger.error("Failed to get evaluation for FEN: {} (lastInfo: {}, bestMove: {})", fen, lastInfoLine != null, bestMove != null);
            throw new IOException("Stockfish analysis failed - no evaluation received");
        }
    }


    private void sendCommand(BufferedWriter writer, String command) throws IOException {
        writer.write(command);
        writer.newLine();
        writer.flush();
        logger.debug("Sent to Stockfish: {}", command);
    }

    private void waitForResponse(BufferedReader reader, String expectedResponse, ExecutorService executor) throws IOException, InterruptedException {
        try {
            while (true) {
                Future<String> lineFuture = executor.submit(reader::readLine);
                String line = lineFuture.get(TIMEOUT_SECONDS, TimeUnit.SECONDS);
                
                if (line == null) {
                    throw new IOException("EOF reached before expected response: " + expectedResponse);
                }
                
                logger.debug("Received from Stockfish: {}", line);
                if (line.contains(expectedResponse)) {
                    return;
                }
            }
        } catch (TimeoutException e) {
            throw new IOException("Timeout waiting for response: " + expectedResponse, e);
        } catch (java.util.concurrent.ExecutionException e) {
            throw new IOException("Error waiting for response: " + expectedResponse, e);
        }
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
