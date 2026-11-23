package com.rephelper.backend.notification;

import com.rephelper.backend.common.BusinessException;
import com.rephelper.backend.notification.NotificationDTOs.*;
import com.rephelper.backend.republic.RepublicMemberRepository;
import com.rephelper.backend.user.UserRepository;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notifications;
    private final UserRepository users;
    private final RepublicMemberRepository members;

    public NotificationService(
            NotificationRepository notifications,
            UserRepository users,
            RepublicMemberRepository members
    ) {
        this.notifications = notifications;
        this.users = users;
        this.members = members;
    }

    @Transactional(readOnly = true)
    public List<NotificationView> listAll(UUID callerUid) {
        return notifications.findByRecipientUidOrderByCreatedAtDesc(callerUid)
                .stream()
                .map(NotificationView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NotificationView> listUnread(UUID callerUid) {
        return notifications.findByRecipientUidAndReadFalseOrderByCreatedAtDesc(callerUid)
                .stream()
                .map(NotificationView::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countUnread(UUID callerUid) {
        return notifications.countByRecipientUidAndReadFalse(callerUid);
    }

    @Transactional(readOnly = true)
    public NotificationView getOwned(UUID callerUid, Long id) {
        Notification entity = notifications.findByIdAndRecipientUid(id, callerUid)
                .orElseThrow(() -> BusinessException.notFound("NOTIFICATION_NOT_FOUND", "Notificação não encontrada."));
        return NotificationView.from(entity);
    }

    @Transactional
    public NotificationView markAsRead(UUID callerUid, Long id) {
        Notification entity = notifications.findByIdAndRecipientUid(id, callerUid)
                .orElseThrow(() -> BusinessException.notFound("NOTIFICATION_NOT_FOUND", "Notificação não encontrada."));
        entity.setRead(true);
        return NotificationView.from(notifications.save(entity));
    }

    @Transactional
    public void markAllAsRead(UUID callerUid) {
        notifications.markAllReadByRecipient(callerUid);
    }

    @Transactional
    public NotificationView create(UUID callerUid, UUID callerRepublicId, CreateNotificationInput input) {
        UUID recipientId = input.recipientId();
        if (!users.existsById(recipientId)) {
            throw BusinessException.notFound("USER_NOT_FOUND", "Destinatário não encontrado.");
        }
        if (!callerUid.equals(recipientId)) {
            if (callerRepublicId == null
                    || members.findByRepublicIdAndUserUidAndStatus(callerRepublicId, recipientId, "ACTIVE").isEmpty()) {
                throw BusinessException.forbidden(
                        "FORBIDDEN",
                        "Você só pode enviar notificações para membros da sua república."
                );
            }
        }

        Notification saved = persistNotification(
                recipientId,
                callerRepublicId,
                input.title().trim(),
                input.message().trim(),
                input.type().trim(),
                input.entityType(),
                input.entityId()
        );
        return NotificationView.from(saved);
    }

    @Transactional
    public void deleteOwned(UUID callerUid, Long id) {
        Notification entity = notifications.findByIdAndRecipientUid(id, callerUid)
                .orElseThrow(() -> BusinessException.notFound("NOTIFICATION_NOT_FOUND", "Notificação não encontrada."));
        notifications.delete(entity);
    }

    @Transactional
    public void clearOld(UUID callerUid, int days) {
        if (days < 1 || days > 3650) {
            throw BusinessException.badRequest("INVALID_DAYS", "Informe um período válido em dias.");
        }
        notifications.deleteOlderThan(callerUid, OffsetDateTime.now().minusDays(days));
    }

    @Transactional
    public void notifyUsers(
            Collection<UUID> recipientUids,
            UUID republicId,
            String title,
            String message,
            String type,
            String entityType,
            String entityId
    ) {
        if (recipientUids == null || recipientUids.isEmpty()) {
            return;
        }
        List<Notification> batch = recipientUids.stream()
                .distinct()
                .map(uid -> buildNotification(uid, republicId, title, message, type, entityType, entityId))
                .toList();
        notifications.saveAll(batch);
    }

    private Notification persistNotification(
            UUID recipientUid,
            UUID republicId,
            String title,
            String message,
            String type,
            String entityType,
            String entityId
    ) {
        return notifications.save(buildNotification(recipientUid, republicId, title, message, type, entityType, entityId));
    }

    private Notification buildNotification(
            UUID recipientUid,
            UUID republicId,
            String title,
            String message,
            String type,
            String entityType,
            String entityId
    ) {
        Notification entity = new Notification();
        entity.setRecipientUid(recipientUid);
        entity.setRepublicId(republicId);
        entity.setTitle(title.length() > 180 ? title.substring(0, 180) : title);
        entity.setMessage(message);
        entity.setType(type.length() > 50 ? type.substring(0, 50) : type);
        entity.setEntityType(entityType);
        entity.setEntityId(entityId);
        entity.setRead(false);
        return entity;
    }
}
