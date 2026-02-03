package com.chessonline.controller;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.chessonline.dto.user.UpdateProfileRequest;
import com.chessonline.dto.user.UserResponse;
import com.chessonline.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public UserResponse me() {
        return userService.getMe();
    }

    @GetMapping("/{username}")
    public UserResponse publicProfile(@PathVariable String username) {
        return userService.getPublicProfile(username);
    }

    @PatchMapping("/me")
    public UserResponse update(@Valid @RequestBody UpdateProfileRequest request) {
        return userService.updateProfile(request);
    }
}
