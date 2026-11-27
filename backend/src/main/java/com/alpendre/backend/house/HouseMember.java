package com.alpendre.backend.house;

import com.alpendre.backend.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "house_members")
public class HouseMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "house_id", nullable = false)
    private House house;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "is_admin", nullable = false)
    private boolean admin;

    @Column(name = "is_owner", nullable = false)
    private boolean owner;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "joined_at", nullable = false, updatable = false)
    private OffsetDateTime joinedAt;

    @PrePersist
    protected void onCreate() {
        if (this.joinedAt == null) this.joinedAt = OffsetDateTime.now();
        if (this.status == null) this.status = "ACTIVE";
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public House getHouse() { return house; }
    public void setHouse(House house) { this.house = house; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public boolean isAdmin() { return admin; }
    public void setAdmin(boolean admin) { this.admin = admin; }

    public boolean isOwner() { return owner; }
    public void setOwner(boolean owner) { this.owner = owner; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(OffsetDateTime joinedAt) { this.joinedAt = joinedAt; }
}
