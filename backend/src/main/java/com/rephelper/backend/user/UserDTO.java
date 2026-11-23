package com.rephelper.backend.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;

public record UserDTO(
        String uid,
        String name,
        String nickname,
        String email,
        String phoneNumber,
        String profilePictureUrl,
        String currentRepublicId,
        @JsonProperty("isAdmin") boolean isAdmin,
        OffsetDateTime createdAt,
        OffsetDateTime lastLogin,
        String status,
        String firebaseUid,
        String provider
) {
    public static UserDTO from(User user, boolean isAdmin) {
        return new UserDTO(
                user.getUid().toString(),
                user.getName(),
                user.getNickname(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getProfilePictureUrl(),
                user.getCurrentRepublicId() != null ? user.getCurrentRepublicId().toString() : null,
                isAdmin,
                user.getCreatedAt(),
                user.getLastLogin(),
                user.getStatus(),
                user.getFirebaseUid(),
                user.getProvider()
        );
    }
}
