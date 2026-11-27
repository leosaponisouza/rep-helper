package com.alpendre.backend.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;

public record UserDTO(
        String uid,
        String name,
        String nickname,
        String email,
        String phoneNumber,
        String profilePictureUrl,
        String currentHouseId,
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
                user.getCurrentHouseId() != null ? user.getCurrentHouseId().toString() : null,
                isAdmin,
                user.getCreatedAt(),
                user.getLastLogin(),
                user.getStatus(),
                user.getFirebaseUid(),
                user.getProvider()
        );
    }
}
