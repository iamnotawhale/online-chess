package com.chessonline.service;

import com.chessonline.model.Game;
import com.chessonline.model.GameChallenge;
import com.chessonline.model.User;
import com.chessonline.repository.GameChallengeRepository;
import com.chessonline.repository.UserRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ChallengeService {

    private final GameChallengeRepository challengeRepository;
    private final UserRepository userRepository;
    private final GameService gameService;

    public ChallengeService(GameChallengeRepository challengeRepository,
                            UserRepository userRepository,
                            @Lazy GameService gameService) {
        this.challengeRepository = challengeRepository;
        this.userRepository = userRepository;
        this.gameService = gameService;
    }

    @Transactional
    public GameChallenge createChallenge(UUID challengerId, UUID challengedId, String timeControl, boolean rated) {
        if (challengerId.equals(challengedId)) {
            throw new RuntimeException("Cannot challenge yourself");
        }

        User challenger = userRepository.findById(challengerId)
                .orElseThrow(() -> new RuntimeException("Challenger not found"));
        User challenged = userRepository.findById(challengedId)
                .orElseThrow(() -> new RuntimeException("Challenged user not found"));

        GameChallenge challenge = new GameChallenge();
        challenge.setChallenger(challenger);
        challenge.setChallenged(challenged);
        challenge.setTimeControl(timeControl != null ? timeControl : "5+3");
        challenge.setRated(rated);
        challenge.setStatus("pending");
        challenge.setExpiresAt(Instant.now().plusSeconds(3600));

        return challengeRepository.save(challenge);
    }

    @Transactional(readOnly = true)
    public List<GameChallenge> getIncomingChallenges(UUID userId) {
        return challengeRepository.findByChallenged_IdAndStatusOrderByCreatedAtDesc(userId, "pending").stream()
                .filter(c -> !c.isExpired())
                .toList();
    }

    @Transactional
    public Game acceptChallenge(UUID challengeId, UUID userId) {
        GameChallenge challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new RuntimeException("Challenge not found"));

        if (!challenge.getChallenged().getId().equals(userId)) {
            throw new RuntimeException("Not authorized to accept this challenge");
        }
        if (!"pending".equals(challenge.getStatus())) {
            throw new RuntimeException("Challenge is no longer pending");
        }
        if (challenge.isExpired()) {
            challenge.setStatus("expired");
            challengeRepository.save(challenge);
            throw new RuntimeException("Challenge has expired");
        }

        Game game = gameService.createGame(
                challenge.getChallenger().getId(),
                challenge.getChallenged().getId(),
                challenge.getTimeControl(),
                null,
                challenge.isRated()
        );

        challenge.setStatus("accepted");
        challenge.setGame(game);
        challengeRepository.save(challenge);

        return game;
    }

    @Transactional
    public GameChallenge declineChallenge(UUID challengeId, UUID userId) {
        GameChallenge challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new RuntimeException("Challenge not found"));

        if (!challenge.getChallenged().getId().equals(userId)) {
            throw new RuntimeException("Not authorized to decline this challenge");
        }
        if (!"pending".equals(challenge.getStatus())) {
            throw new RuntimeException("Challenge is no longer pending");
        }

        challenge.setStatus("declined");
        return challengeRepository.save(challenge);
    }
}
