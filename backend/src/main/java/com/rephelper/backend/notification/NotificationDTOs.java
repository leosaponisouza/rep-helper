package com.rephelper.backend.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class NotificationDTOs {

    private NotificationDTOs() {}

    public record NotificationView(
            Long id,
            String recipientId,
            String republicId,
            String title,
            String message,
            String type,
            String entityType,
            String entityId,
            boolean read,
            OffsetDateTime createdAt
    ) {
        public static NotificationView from(Notification entity) {
            return new NotificationView(
                    entity.getId(),
                    entity.getRecipientUid().toString(),
                    entity.getRepublicId() != null ? entity.getRepublicId().toString() : null,
                    entity.getTitle(),
                    entity.getMessage(),
                    entity.getType(),
                    entity.getEntityType(),
                    entity.getEntityId(),
                    entity.isRead(),
                    entity.getCreatedAt()
            );
        }
    }

    public record CreateNotificationInput(
            @NotNull UUID recipientId,
            @NotBlank @Size(max = 180) String title,
            @NotBlank String message,
            @NotBlank @Size(max = 50) String type,
            @Size(max = 50) String entityType,
            @Size(max = 100) String entityId
    ) {}

    public record UnreadCountView(long count) {}
}
