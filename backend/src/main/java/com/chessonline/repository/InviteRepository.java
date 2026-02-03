package com.chessonline.repository;

import com.chessonline.model.Invite;
import com.chessonline.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InviteRepository extends JpaRepository<Invite, UUID> {
    
    Optional<Invite> findByCode(String code);
    
    List<Invite> findByCreatorAndUsedFalseAndExpiresAtAfter(User creator, LocalDateTime now);
    
    List<Invite> findByCreator(User creator);
    
    void deleteByExpiresAtBeforeAndUsedFalse(LocalDateTime now);
}
