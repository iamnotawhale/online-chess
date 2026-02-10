package com.chessonline.dto;

import java.util.List;

public class AnalysisResponse {
    private String gameId;
    private int totalMoves;
    private double whiteAccuracy;
    private double blackAccuracy;
    private int whiteMistakes;
    private int blackMistakes;
    private int whiteBlunders;
    private int blackBlunders;
    private List<MoveAnalysis> moves;

    public static class MoveAnalysis {
        private int moveNumber;
        private boolean isWhiteMove;
        private String move;          // SAN or UCI
        private int evaluation;       // in centipawns
        private String bestMove;      // Best move in UCI format
        private Integer bestEvaluation;
        private boolean isMistake;
        private boolean isInaccuracy;
        private boolean isBlunder;

        public MoveAnalysis() {}

        public MoveAnalysis(int moveNumber, boolean isWhiteMove, String move, 
                          int evaluation, String bestMove) {
            this.moveNumber = moveNumber;
            this.isWhiteMove = isWhiteMove;
            this.move = move;
            this.evaluation = evaluation;
            this.bestMove = bestMove;
        }

        // Getters and Setters
        public int getMoveNumber() { return moveNumber; }
        public void setMoveNumber(int moveNumber) { this.moveNumber = moveNumber; }

        public boolean isWhiteMove() { return isWhiteMove; }
        public void setWhiteMove(boolean whiteMove) { isWhiteMove = whiteMove; }

        public String getMove() { return move; }
        public void setMove(String move) { this.move = move; }

        public int getEvaluation() { return evaluation; }
        public void setEvaluation(int evaluation) { this.evaluation = evaluation; }

        public String getBestMove() { return bestMove; }
        public void setBestMove(String bestMove) { this.bestMove = bestMove; }

        public Integer getBestEvaluation() { return bestEvaluation; }
        public void setBestEvaluation(Integer bestEvaluation) { this.bestEvaluation = bestEvaluation; }

        public boolean isMistake() { return isMistake; }
        public void setMistake(boolean mistake) { isMistake = mistake; }

        public boolean isInaccuracy() { return isInaccuracy; }
        public void setInaccuracy(boolean inaccuracy) { isInaccuracy = inaccuracy; }

        public boolean isBlunder() { return isBlunder; }
        public void setBlunder(boolean blunder) { isBlunder = blunder; }
    }

    public AnalysisResponse() {}

    // Getters and Setters
    public String getGameId() { return gameId; }
    public void setGameId(String gameId) { this.gameId = gameId; }

    public int getTotalMoves() { return totalMoves; }
    public void setTotalMoves(int totalMoves) { this.totalMoves = totalMoves; }

    public double getWhiteAccuracy() { return whiteAccuracy; }
    public void setWhiteAccuracy(double whiteAccuracy) { this.whiteAccuracy = whiteAccuracy; }

    public double getBlackAccuracy() { return blackAccuracy; }
    public void setBlackAccuracy(double blackAccuracy) { this.blackAccuracy = blackAccuracy; }

    public int getWhiteMistakes() { return whiteMistakes; }
    public void setWhiteMistakes(int whiteMistakes) { this.whiteMistakes = whiteMistakes; }

    public int getBlackMistakes() { return blackMistakes; }
    public void setBlackMistakes(int blackMistakes) { this.blackMistakes = blackMistakes; }

    public int getWhiteBlunders() { return whiteBlunders; }
    public void setWhiteBlunders(int whiteBlunders) { this.whiteBlunders = whiteBlunders; }

    public int getBlackBlunders() { return blackBlunders; }
    public void setBlackBlunders(int blackBlunders) { this.blackBlunders = blackBlunders; }

    public List<MoveAnalysis> getMoves() { return moves; }
    public void setMoves(List<MoveAnalysis> moves) { this.moves = moves; }
}
