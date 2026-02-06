package com.chessonline.dto.user;

import jakarta.validation.constraints.Size;

public class UpdateProfileRequest {

    @Size(min = 3, max = 20)
    private String username;

    @Size(min = 6, max = 100)
    private String password;

    @Size(min = 2, max = 2)
    private String country;

    @Size(max = 500)
    private String bio;

    @Size(max = 512)
    private String avatarUrl;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }
}
