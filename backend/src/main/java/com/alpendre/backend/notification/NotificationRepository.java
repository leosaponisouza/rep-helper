package com.alpendre.backend.notification;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientUidOrderByCreatedAtDesc(UUID recipientUid);

    List<Notification> findByRecipientUidAndReadFalseOrderByCreatedAtDesc(UUID recipientUid);

    long countByRecipientUidAndReadFalse(UUID recipientUid);

    Optional<Notification> findByIdAndRecipientUid(Long id, UUID recipientUid);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipientUid = :uid AND n.read = false")
    int markAllReadByRecipient(@Param("uid") UUID recipientUid);

    @Modifying
    @Query("DELETE FROM Notification n WHERE n.recipientUid = :uid AND n.createdAt < :cutoff")
    int deleteOlderThan(@Param("uid") UUID recipientUid, @Param("cutoff") OffsetDateTime cutoff);
}
