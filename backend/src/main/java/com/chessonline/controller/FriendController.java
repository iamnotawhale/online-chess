package com.chessonline.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.chessonline.dto.user.FriendshipResponse;
import com.chessonline.service.FriendshipService;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private final FriendshipService friendshipService;

    public FriendController(FriendshipService friendshipService) {
        this.friendshipService = friendshipService;
    }

    @GetMapping
    public List<FriendshipResponse> getFriends() {
        return friendshipService.getFriends();
    }

    @GetMapping("/requests")
    public List<FriendshipResponse> getPendingRequests() {
        return friendshipService.getPendingRequests();
    }

    @GetMapping("/status/{userId}")
    public FriendshipResponse getFriendshipStatus(@PathVariable UUID userId) {
        return friendshipService.getFriendshipStatus(userId);
    }

    @PostMapping("/{userId}")
    public FriendshipResponse sendFriendRequest(@PathVariable UUID userId) {
        return friendshipService.sendFriendRequest(userId);
    }

    @PostMapping("/accept/{friendshipId}")
    public FriendshipResponse acceptFriendRequest(@PathVariable UUID friendshipId) {
        return friendshipService.acceptFriendRequest(friendshipId);
    }

    @DeleteMapping("/decline/{friendshipId}")
    public void declineFriendRequest(@PathVariable UUID friendshipId) {
        friendshipService.declineFriendRequest(friendshipId);
    }

    @DeleteMapping("/cancel/{friendshipId}")
    public void cancelFriendRequest(@PathVariable UUID friendshipId) {
        friendshipService.cancelFriendRequest(friendshipId);
    }

    @DeleteMapping("/{userId}")
    public void removeFriend(@PathVariable UUID userId) {
        friendshipService.removeFriend(userId);
    }
}
