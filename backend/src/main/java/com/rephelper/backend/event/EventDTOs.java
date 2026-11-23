package com.rephelper.backend.event;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.rephelper.backend.user.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public final class EventDTOs {

    private EventDTOs() {}

    public record EventInvitationView(
            String userId,
            String userName,
            String userEmail,
            String nickName,
            String profilePictureUrl,
            String status
    ) {
        public static EventInvitationView from(EventInvitation inv) {
            User u = inv.getUser();
            return new EventInvitationView(
                    u.getUid().toString(),
                    u.getName(),
                    u.getEmail(),
                    u.getNickname(),
                    u.getProfilePictureUrl(),
                    inv.getStatus()
            );
        }
    }

    public record EventView(
            Long id,
            String title,
            String description,
            OffsetDateTime startDate,
            OffsetDateTime endDate,
            String location,
            String republicId,
            String republicName,
            String creatorId,
            String creatorName,
            List<EventInvitationView> invitations,
            OffsetDateTime createdAt,
            @JsonProperty("isFinished") boolean isFinished,
            @JsonProperty("isHappening") boolean isHappening
    ) {
        public static EventView from(Event event) {
            OffsetDateTime now = OffsetDateTime.now();
            boolean finished = now.isAfter(event.getEndDate());
            boolean happening = !now.isBefore(event.getStartDate()) && !now.isAfter(event.getEndDate());

            List<EventInvitationView> invViews = event.getInvitations().stream()
                    .map(EventInvitationView::from)
                    .toList();

            return new EventView(
                    event.getId(),
                    event.getTitle(),
                    event.getDescription(),
                    event.getStartDate(),
                    event.getEndDate(),
                    event.getLocation(),
                    event.getRepublic().getId().toString(),
                    event.getRepublic().getName(),
                    event.getCreator().getUid().toString(),
                    event.getCreator().getName(),
                    invViews,
                    event.getCreatedAt(),
                    finished,
                    happening
            );
        }
    }

    public record CreateEventInput(
            @NotBlank @Size(max = 180) String title,
            @NotBlank String description,
            @NotNull OffsetDateTime startDate,
            @NotNull OffsetDateTime endDate,
            @NotBlank @Size(max = 255) String location,
            @NotNull UUID republicId,
            List<UUID> invitedUserIds
    ) {}

    public record UpdateEventInput(
            @Size(max = 180) String title,
            String description,
            OffsetDateTime startDate,
            OffsetDateTime endDate,
            @Size(max = 255) String location
    ) {}

    public record RespondEventInput(
            @NotBlank String status
    ) {}

    public record InviteUsersInput(
            @NotNull List<UUID> userIds
    ) {}
}
