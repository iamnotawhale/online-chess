package com.chessonline.service;

import com.chessonline.model.Game;
import com.chessonline.model.RatingHistory;
import com.chessonline.model.User;
import com.chessonline.model.UserStats;
import com.chessonline.repository.RatingHistoryRepository;
import com.chessonline.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class RatingService {

    private static final int INITIAL_RATING = 1200;
    private static final int MINIMUM_RATING = 100;

    @Autowired
    private RatingHistoryRepository ratingHistoryRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Calculate K-factor based on player rating
     * Higher rated players have lower K-factor (more stable rating)
     */
    private int calculateKFactor(int rating) {
        if (rating >= 2400) return 16;  // Super GMs
        if (rating >= 2200) return 20;  // GMs
        if (rating >= 2000) return 24;  // Masters
        if (rating >= 1800) return 28;  // Experts
        return 32; // Regular players
    }

    /**
     * Calculate expected score (probability of winning)
     * Formula: 1 / (1 + 10^((opponent_rating - player_rating) / 400))
     */
    private double calculateExpectedScore(int playerRating, int opponentRating) {
        double ratingDiff = opponentRating - playerRating;
        return 1.0 / (1.0 + Math.pow(10, ratingDiff / 400.0));
    }

    /**
     * Calculate new rating after a game
     * Formula: new_rating = current_rating + K * (actual_score - expected_score)
     * actual_score: 1 for win, 0.5 for draw, 0 for loss
     */
    @Transactional
    public void updateRatingsForGame(Game game) {
        User whitePlayer = game.getPlayerWhite();
        User blackPlayer = game.getPlayerBlack();

        if (game.getResult() == null) {
            return; // Game has no result yet
        }

        // Get current ratings
        int whiteRating = whitePlayer.getRating();
        int blackRating = blackPlayer.getRating();

        // Determine actual scores
        double whiteScore;
        double blackScore;

        if ("white_win".equals(game.getResult())) {
            whiteScore = 1.0;
            blackScore = 0.0;
        } else if ("black_win".equals(game.getResult())) {
            whiteScore = 0.0;
            blackScore = 1.0;
        } else {
            whiteScore = 0.5;
            blackScore = 0.5;
        }

        // Calculate expected scores
        double whiteExpected = calculateExpectedScore(whiteRating, blackRating);
        double blackExpected = calculateExpectedScore(blackRating, whiteRating);

        // Calculate K-factors
        int whiteK = calculateKFactor(whiteRating);
        int blackK = calculateKFactor(blackRating);

        // Calculate rating changes
        int whiteChange = (int) Math.round(whiteK * (whiteScore - whiteExpected));
        int blackChange = (int) Math.round(blackK * (blackScore - blackExpected));

        // Calculate new ratings
        int whiteNewRating = Math.max(MINIMUM_RATING, whiteRating + whiteChange);
        int blackNewRating = Math.max(MINIMUM_RATING, blackRating + blackChange);

        // Update player ratings
        whitePlayer.setRating(whiteNewRating);
        blackPlayer.setRating(blackNewRating);

        // Update user stats
        updateUserStats(whitePlayer, game, true);
        updateUserStats(blackPlayer, game, false);

        // Save updated players
        userRepository.save(whitePlayer);
        userRepository.save(blackPlayer);

        // Record rating history
        recordRatingHistory(game, whitePlayer, whiteRating, whiteNewRating, whiteChange);
        recordRatingHistory(game, blackPlayer, blackRating, blackNewRating, blackChange);
    }

    /**
     * Update user stats (wins/losses/draws)
     */
    private void updateUserStats(User player, Game game, boolean isWhite) {
        UserStats stats = player.getStats();

        if ("white_win".equals(game.getResult())) {
            if (isWhite) {
                stats.setWins(stats.getWins() + 1);
            } else {
                stats.setLosses(stats.getLosses() + 1);
            }
        } else if ("black_win".equals(game.getResult())) {
            if (isWhite) {
                stats.setLosses(stats.getLosses() + 1);
            } else {
                stats.setWins(stats.getWins() + 1);
            }
        } else {
            stats.setDraws(stats.getDraws() + 1);
        }

        stats.setGamesPlayed(stats.getGamesPlayed() + 1);
    }

    /**
     * Record rating change in history
     */
    private void recordRatingHistory(Game game, User player, int ratingBefore, int ratingAfter, int change) {
        RatingHistory history = new RatingHistory();
        history.setUser(player);
        history.setGame(game);
        history.setRatingBefore(ratingBefore);
        history.setRatingAfter(ratingAfter);
        history.setRatingChange(change);

        ratingHistoryRepository.save(history);
    }

    /**
     * Get rating history for a user
     */
    @Transactional(readOnly = true)
    public List<RatingHistory> getUserRatingHistory(UUID userId) {
        return ratingHistoryRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get rating changes for a specific game
     */
    @Transactional(readOnly = true)
    public List<RatingHistory> getGameRatingChanges(UUID gameId) {
        return ratingHistoryRepository.findByGameIdOrderByCreatedAtDesc(gameId);
    }

    /**
     * Get current rating for a user
     */
    @Transactional(readOnly = true)
    public int getCurrentRating(UUID userId) {
        return userRepository.findById(userId)
                .map(User::getRating)
                .orElse(INITIAL_RATING);
    }

    /**
     * Initialize rating for new user
     */
    public int getInitialRating() {
        return INITIAL_RATING;
    }
}
