package com.chessonline.repository;

import com.chessonline.model.Friendship;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, UUID> {
    
    @Query("SELECT f FROM Friendship f WHERE (f.user.id = :userId OR f.friend.id = :userId) AND f.status = 'accepted'")
    List<Friendship> findAcceptedFriends(@Param("userId") UUID userId);
    
    @Query("SELECT f FROM Friendship f WHERE f.user.id = :userId AND f.status = 'pending'")
    List<Friendship> findPendingFriendRequests(@Param("userId") UUID userId);
    
    @Query("SELECT f FROM Friendship f WHERE f.friend.id = :userId AND f.status = 'pending'")
    List<Friendship> findIncomingFriendRequests(@Param("userId") UUID userId);
    
    Optional<Friendship> findByUserIdAndFriendId(UUID userId, UUID friendId);
    
    @Query("SELECT f FROM Friendship f WHERE (f.user.id = :userId AND f.friend.id = :friendId) OR (f.user.id = :friendId AND f.friend.id = :userId)")
    Optional<Friendship> findFriendship(@Param("userId") UUID userId, @Param("friendId") UUID friendId);
}
