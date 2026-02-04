package com.chessonline.service;

import com.chessonline.model.Invite;
import com.chessonline.model.User;
import com.chessonline.repository.InviteRepository;
import com.chessonline.repository.UserRepository;
import com.chessonline.model.Game;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class InviteService {

    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars
    private static final int CODE_LENGTH = 8;
    private static final SecureRandom random = new SecureRandom();

    @Autowired
    private InviteRepository inviteRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GameService gameService;

    /**
     * Generate a unique invite code
     */
    private String generateUniqueCode() {
        String code;
        do {
            code = generateCode();
        } while (inviteRepository.findByCode(code).isPresent());
        return code;
    }

    private String generateCode() {
        StringBuilder code = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            code.append(CODE_CHARS.charAt(random.nextInt(CODE_CHARS.length())));
        }
        return code.toString();
    }

    /**
     * Create a new invite
     */
    @Transactional
    public Invite createInvite(UUID creatorId, String gameMode, String timeControl, Integer expirationHours) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String code = generateUniqueCode();
        Invite invite = new Invite(code, creator, gameMode, timeControl);
        
        if (expirationHours != null) {
            invite.setExpiresAt(LocalDateTime.now().plusHours(expirationHours));
        }

        return inviteRepository.save(invite);
    }

    /**
     * Get invite by code
     */
    @Transactional(readOnly = true)
    public Optional<Invite> getInviteByCode(String code) {
        Optional<Invite> invite = inviteRepository.findByCode(code.toUpperCase());
        // Force load lazy relationships
        invite.ifPresent(i -> {
            i.getCreator().getUsername();
            if (i.getAcceptedBy() != null) {
                i.getAcceptedBy().getUsername();
            }
        });
        return invite;
    }

    /**
     * Accept an invite
     */
    @Transactional
    public Game acceptInvite(String code, UUID acceptorId) {
        Invite invite = inviteRepository.findByCode(code.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Invite not found"));

        if (invite.getUsed()) {
            throw new RuntimeException("Invite already used");
        }

        if (invite.isExpired()) {
            throw new RuntimeException("Invite expired");
        }

        User acceptor = userRepository.findById(acceptorId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (invite.getCreator().getId().equals(acceptorId)) {
            throw new RuntimeException("Cannot accept your own invite");
        }

        invite.setUsed(true);
        invite.setUsedAt(LocalDateTime.now());
        invite.setAcceptedBy(acceptor);

        inviteRepository.save(invite);

        return gameService.createGame(
            invite.getCreator().getId(),
            acceptor.getId(),
            invite.getTimeControl(),
            invite
        );
    }

    /**
     * Cancel an invite
     */
    @Transactional
    public void cancelInvite(String code, UUID userId) {
        Invite invite = inviteRepository.findByCode(code.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Invite not found"));

        if (!invite.getCreator().getId().equals(userId)) {
            throw new RuntimeException("Not authorized to cancel this invite");
        }

        if (invite.getUsed()) {
            throw new RuntimeException("Cannot cancel used invite");
        }

        inviteRepository.delete(invite);
    }

    /**
     * Get active invites for a user
     */
    @Transactional(readOnly = true)
    public List<Invite> getActiveInvites(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<Invite> invites = inviteRepository.findByCreatorAndUsedFalseAndExpiresAtAfter(user, LocalDateTime.now());
        // Force load lazy relationships
        invites.forEach(i -> i.getCreator().getUsername());
        return invites;
    }

    /**
     * Get all invites for a user (including expired and used)
     */
    @Transactional(readOnly = true)
    public List<Invite> getAllInvites(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        List<Invite> invites = inviteRepository.findByCreator(user);
        // Force load lazy relationships
        invites.forEach(i -> {
            i.getCreator().getUsername();
            if (i.getAcceptedBy() != null) {
                i.getAcceptedBy().getUsername();
            }
        });
        return invites;
    }

    /**
     * Clean up expired invites (runs daily at 3 AM)
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredInvites() {
        inviteRepository.deleteByExpiresAtBeforeAndUsedFalse(LocalDateTime.now());
    }
}
