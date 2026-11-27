package com.alpendre.backend.auth;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findTopByUserUidAndUsedFalseOrderByCreatedAtDesc(UUID userUid);
}
