package com.rephelper.backend.republic;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.rephelper.backend.user.User;
import com.rephelper.backend.user.UserDTO;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public final class RepublicPayloads {

    private RepublicPayloads() {}

    public record AddressView(
            String street,
            String number,
            String complement,
            String neighborhood,
            String city,
            String state,
            @JsonAlias("zip_code") String zipCode,
            String fullAddress
    ) {
        public static AddressView of(RepublicAddress entity) {
            return new AddressView(
                    entity.getStreet(),
                    entity.getNumber(),
                    entity.getComplement(),
                    entity.getNeighborhood(),
                    entity.getCity(),
                    entity.getState(),
                    entity.getZipCode(),
                    entity.toFullAddress()
            );
        }
    }

    public record RepublicView(
            String id,
            String name,
            String code,
            AddressView address,
            String ownerId,
            String ownerName,
            long memberCount,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        public static RepublicView of(Republic entity, long activeMembers) {
            return new RepublicView(
                    entity.getId().toString(),
                    entity.getName(),
                    entity.getCode(),
                    AddressView.of(entity.getAddress()),
                    entity.getOwner().getUid().toString(),
                    entity.getOwner().getName(),
                    activeMembers,
                    entity.getCreatedAt(),
                    entity.getUpdatedAt()
            );
        }
    }

    public record MemberView(
            String id,
            String uid,
            String name,
            String nickname,
            String profilePictureUrl,
            String email,
            String phoneNumber,
            @JsonProperty("isAdmin") boolean isAdmin,
            @JsonProperty("isOwner") boolean isOwner,
            OffsetDateTime joinedAt,
            OffsetDateTime entryDate,
            String status
    ) {
        public static MemberView of(RepublicMember membership) {
            User account = membership.getUser();
            String idText = account.getUid().toString();
            return new MemberView(
                    idText,
                    idText,
                    account.getName(),
                    account.getNickname(),
                    account.getProfilePictureUrl(),
                    account.getEmail(),
                    account.getPhoneNumber(),
                    membership.isAdmin() || membership.isOwner(),
                    membership.isOwner(),
                    membership.getJoinedAt(),
                    membership.getJoinedAt(),
                    membership.getStatus()
            );
        }
    }

    public record CreateInput(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 200) String street,
            @NotBlank @Size(max = 30) String number,
            @Size(max = 100) String complement,
            @NotBlank @Size(max = 120) String neighborhood,
            @NotBlank @Size(max = 120) String city,
            @NotBlank @Size(min = 2, max = 2) String state,
            @JsonAlias("zip_code") @NotBlank @Size(max = 20) String zipCode
    ) {}

    public record UpdateInput(
            @Size(max = 120) String name,
            @Size(max = 200) String street,
            @Size(max = 30) String number,
            @Size(max = 100) String complement,
            @Size(max = 120) String neighborhood,
            @Size(max = 120) String city,
            @Size(max = 2) String state,
            @JsonAlias("zip_code") @Size(max = 20) String zipCode,
            @Valid AddressView address
    ) {}

    public record JoinInput(@NotBlank String code) {}

    public record RegenerateCodeInput(@JsonAlias("code") String customCode) {}

    public record CreatedOutput(
            RepublicView republic,
            UserDTO user,
            String token,
            String refreshToken,
            String message
    ) {}

    public record JoinedOutput(
            String token,
            String refreshToken,
            UserDTO user,
            RepublicView republic,
            String message
    ) {}

    public record CodeOutput(String code, String message) {}

    public record CodeLengthOutput(int length, int codeLength) {}
}
