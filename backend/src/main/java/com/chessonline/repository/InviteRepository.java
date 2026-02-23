package com.chessonline.repository;

import com.chessonline.model.Invite;
import com.chessonline.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InviteRepository extends JpaRepository<Invite, String> {

    @Query("SELECT i FROM Invite i JOIN FETCH i.creator LEFT JOIN FETCH i.acceptedBy WHERE i.id = :id")
    Optional<Invite> findByIdWithUsers(@Param("id") String id);
    
    List<Invite> findByCreatorAndUsedFalseAndExpiresAtAfter(User creator, LocalDateTime now);
    
    List<Invite> findByCreator(User creator);
    
    void deleteByExpiresAtBeforeAndUsedFalse(LocalDateTime now);
}
