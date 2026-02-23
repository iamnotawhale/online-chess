package com.chessonline.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.chessonline.dto.user.FriendshipResponse;
import com.chessonline.dto.user.UserResponse;
import com.chessonline.model.Friendship;
import com.chessonline.model.User;
import com.chessonline.repository.FriendshipRepository;

@Service
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserService userService;

    public FriendshipService(FriendshipRepository friendshipRepository, UserService userService) {
        this.friendshipRepository = friendshipRepository;
        this.userService = userService;
    }

    public FriendshipResponse sendFriendRequest(UUID friendId) {
        User currentUser = userService.getCurrentUserEntity();
        
        if (currentUser.getId().equals(friendId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot add yourself as a friend");
        }

        User friend = userService.getUserEntity(friendId);
        if (friend == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }

        // Check if friendship already exists
        var existing = friendshipRepository.findFriendship(currentUser.getId(), friendId);
        if (existing.isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Friendship already exists");
        }

        Friendship friendship = new Friendship();
        friendship.setUser(currentUser);
        friendship.setFriend(friend);
        friendship.setStatus("pending");

        Friendship saved = friendshipRepository.save(friendship);
        UserResponse friendResponse = userService.toUserResponse(friend, false);
        return new FriendshipResponse(saved.getId(), friendResponse, saved.getStatus(), saved.getCreatedAt());
    }

    public FriendshipResponse acceptFriendRequest(UUID friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Friendship request not found"));

        User currentUser = userService.getCurrentUserEntity();
        if (!friendship.getFriend().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot accept this friend request");
        }

        friendship.setStatus("accepted");
        Friendship saved = friendshipRepository.save(friendship);
        UserResponse friendResponse = userService.toUserResponse(friendship.getUser(), false);
        return new FriendshipResponse(saved.getId(), friendResponse, saved.getStatus(), saved.getCreatedAt());
    }

    public void declineFriendRequest(UUID friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Friendship request not found"));

        User currentUser = userService.getCurrentUserEntity();
        if (!friendship.getFriend().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot decline this friend request");
        }

        friendshipRepository.delete(friendship);
    }

    public void cancelFriendRequest(UUID friendshipId) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Friendship request not found"));

        User currentUser = userService.getCurrentUserEntity();
        if (!friendship.getUser().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot cancel this friend request");
        }

        if (!friendship.getStatus().equals("pending")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Can only cancel pending friend requests");
        }

        friendshipRepository.delete(friendship);
    }

    public void removeFriend(UUID friendId) {
        User currentUser = userService.getCurrentUserEntity();
        
        Friendship friendship = friendshipRepository.findFriendship(currentUser.getId(), friendId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Friendship not found"));

        if (!friendship.getStatus().equals("accepted")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Can only remove accepted friends");
        }

        friendshipRepository.delete(friendship);
    }

    public List<FriendshipResponse> getFriends() {
        User currentUser = userService.getCurrentUserEntity();
        List<Friendship> friendships = friendshipRepository.findAcceptedFriends(currentUser.getId());
        
        return friendships.stream()
            .map(f -> {
                User friendUser = f.getUser().getId().equals(currentUser.getId()) ? f.getFriend() : f.getUser();
                UserResponse friendResponse = userService.toUserResponse(friendUser, false);
                return new FriendshipResponse(f.getId(), friendResponse, f.getStatus(), f.getCreatedAt());
            })
            .collect(Collectors.toList());
    }

    public List<FriendshipResponse> getPendingRequests() {
        User currentUser = userService.getCurrentUserEntity();
        List<Friendship> incoming = friendshipRepository.findIncomingFriendRequests(currentUser.getId());
        
        return incoming.stream()
            .map(f -> {
                UserResponse friendResponse = userService.toUserResponse(f.getUser(), false);
                return new FriendshipResponse(f.getId(), friendResponse, f.getStatus(), f.getCreatedAt());
            })
            .collect(Collectors.toList());
    }

    public FriendshipResponse getFriendshipStatus(UUID userId) {
        User currentUser = userService.getCurrentUserEntity();
        var friendship = friendshipRepository.findFriendship(currentUser.getId(), userId);
        
        if (friendship.isEmpty()) {
            return null;
        }

        Friendship f = friendship.get();
        
        // Only return the friendship if:
        // 1. It's accepted (bidirectional), OR
        // 2. It's pending AND the current user is the sender (f.user.id == currentUser.id)
        if (!f.getStatus().equals("accepted") && !f.getUser().getId().equals(currentUser.getId())) {
            return null;
        }
        
        User friendUser = f.getUser().getId().equals(currentUser.getId()) ? f.getFriend() : f.getUser();
        UserResponse friendResponse = userService.toUserResponse(friendUser, false);
        return new FriendshipResponse(f.getId(), friendResponse, f.getStatus(), f.getCreatedAt());
    }
}
