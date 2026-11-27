package com.alpendre.backend.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "uid", nullable = false, updatable = false)
    private UUID uid;

    @Column(name = "name", nullable = false, length = 120)
    private String name;

    @Column(name = "nickname", length = 60)
    private String nickname;

    @Column(name = "email", nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(name = "profile_picture_url", length = 500)
    private String profilePictureUrl;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "provider", nullable = false, length = 30)
    private String provider = "email";

    @Column(name = "firebase_uid", length = 128)
    private String firebaseUid;

    @Column(name = "current_house_id")
    private UUID currentHouseId;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "active";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "last_login")
    private OffsetDateTime lastLogin;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
        if (this.status == null) {
            this.status = "active";
        }
        if (this.provider == null) {
            this.provider = "email";
        }
    }

    public UUID getUid() { return uid; }
    public void setUid(UUID uid) { this.uid = uid; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getProfilePictureUrl() { return profilePictureUrl; }
    public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getFirebaseUid() { return firebaseUid != null ? firebaseUid : (uid != null ? uid.toString() : null); }
    public void setFirebaseUid(String firebaseUid) { this.firebaseUid = firebaseUid; }

    public UUID getCurrentHouseId() { return currentHouseId; }
    public void setCurrentHouseId(UUID currentHouseId) { this.currentHouseId = currentHouseId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getLastLogin() { return lastLogin; }
    public void setLastLogin(OffsetDateTime lastLogin) { this.lastLogin = lastLogin; }
}
