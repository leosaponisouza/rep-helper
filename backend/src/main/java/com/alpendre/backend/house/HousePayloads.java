package com.alpendre.backend.house;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.alpendre.backend.user.User;
import com.alpendre.backend.user.UserDTO;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;

public final class HousePayloads {

    private HousePayloads() {}

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
        public static AddressView of(HouseAddress entity) {
            if (entity == null) {
                return new AddressView(null, null, null, null, null, null, null, "");
            }
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

    public record HouseView(
            String id,
            String name,
            String code,
            String presetType,
            boolean hasSharedFund,
            boolean requireExpenseApproval,
            boolean allMembersAdmin,
            AddressView address,
            String ownerId,
            String ownerName,
            long memberCount,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
        public static HouseView of(House entity, long activeMembers) {
            return new HouseView(
                    entity.getId().toString(),
                    entity.getName(),
                    entity.getCode(),
                    entity.getPresetType(),
                    entity.isHasSharedFund(),
                    entity.isRequireExpenseApproval(),
                    entity.isAllMembersAdmin(),
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
        public static MemberView of(HouseMember membership) {
            User account = membership.getUser();
            String idText = account.getUid().toString();
            boolean effectiveAdmin = membership.isAdmin()
                    || membership.isOwner()
                    || (membership.getHouse() != null && membership.getHouse().isAllMembersAdmin());
            return new MemberView(
                    idText,
                    idText,
                    account.getName(),
                    account.getNickname(),
                    account.getProfilePictureUrl(),
                    account.getEmail(),
                    account.getPhoneNumber(),
                    effectiveAdmin,
                    membership.isOwner(),
                    membership.getJoinedAt(),
                    membership.getJoinedAt(),
                    membership.getStatus()
            );
        }
    }

    public record CreateInput(
            @NotBlank @Size(min = 2, max = 120) String name,
            String presetType,
            Boolean hasSharedFund,
            Boolean requireExpenseApproval,
            Boolean allMembersAdmin,
            @Size(max = 200) String street,
            @Size(max = 30) String number,
            @Size(max = 100) String complement,
            @Size(max = 120) String neighborhood,
            @Size(max = 120) String city,
            @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "Estado deve ter 2 letras") String state,
            @JsonAlias("zip_code") @Size(max = 20) String zipCode
    ) {}

    public record UpdateInput(
            @Size(max = 120) String name,
            String presetType,
            Boolean hasSharedFund,
            Boolean requireExpenseApproval,
            Boolean allMembersAdmin,
            @Size(max = 200) String street,
            @Size(max = 30) String number,
            @Size(max = 100) String complement,
            @Size(max = 120) String neighborhood,
            @Size(max = 120) String city,
            @Pattern(regexp = "^$|^[A-Za-z]{2}$", message = "Estado deve ter 2 letras") String state,
            @JsonAlias("zip_code") @Size(max = 20) String zipCode,
            @Valid AddressView address
    ) {}

    public record JoinInput(@NotBlank String code) {}

    public record RegenerateCodeInput(@JsonAlias("code") String customCode) {}

    public record CreatedOutput(
            HouseView house,
            UserDTO user,
            String token,
            String refreshToken,
            String message
    ) {}

    public record JoinedOutput(
            String token,
            String refreshToken,
            UserDTO user,
            HouseView house,
            String message
    ) {}

    public record CodeOutput(String code, String message) {}

    public record CodeLengthOutput(int length, int codeLength) {}
}
