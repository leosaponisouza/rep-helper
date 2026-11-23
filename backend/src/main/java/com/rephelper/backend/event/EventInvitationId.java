package com.rephelper.backend.event;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
public class EventInvitationId implements Serializable {

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(name = "user_uid", nullable = false)
    private UUID userUid;

    public EventInvitationId() {}

    public EventInvitationId(Long eventId, UUID userUid) {
        this.eventId = eventId;
        this.userUid = userUid;
    }

    public Long getEventId() {
        return eventId;
    }

    public UUID getUserUid() {
        return userUid;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EventInvitationId that)) return false;
        return Objects.equals(eventId, that.eventId) && Objects.equals(userUid, that.userUid);
    }

    @Override
    public int hashCode() {
        return Objects.hash(eventId, userUid);
    }
}
