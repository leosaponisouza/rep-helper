package com.rephelper.backend.event;

import com.rephelper.backend.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "event_invitations")
public class EventInvitation {

    @EmbeddedId
    private EventInvitationId id = new EventInvitationId();

    @MapsId("eventId")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @MapsId("userUid")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_uid", nullable = false)
    private User user;

    @Column(nullable = false, length = 20)
    private String status = "INVITED";

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    public EventInvitation() {}

    public EventInvitation(Event event, User user, String status) {
        this.id = new EventInvitationId(event.getId(), user.getUid());
        this.event = event;
        this.user = user;
        this.status = status;
    }

    public EventInvitationId getId() {
        return id;
    }

    public Event getEvent() {
        return event;
    }

    public void setEvent(Event event) {
        this.event = event;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getRespondedAt() {
        return respondedAt;
    }

    public void setRespondedAt(OffsetDateTime respondedAt) {
        this.respondedAt = respondedAt;
    }
}
