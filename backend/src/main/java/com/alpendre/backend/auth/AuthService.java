package com.alpendre.backend.auth;

import com.alpendre.backend.auth.AuthDTOs.*;
import com.alpendre.backend.common.BusinessException;
import com.alpendre.backend.house.HouseMemberRepository;
import com.alpendre.backend.user.User;
import com.alpendre.backend.user.UserDTO;
import com.alpendre.backend.user.UserRepository;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AuthService {

    private static final int MAX_RESET_ATTEMPTS = 5;
    private static final long RESET_COOLDOWN_SECONDS = 60;

    private final UserRepository userRepository;
    private final HouseMemberRepository memberRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleOAuthVerifier googleOAuthVerifier;
    private final ApplicationEventPublisher eventPublisher;
    private final TransactionTemplate transactionTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            UserRepository userRepository,
            HouseMemberRepository memberRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            GoogleOAuthVerifier googleOAuthVerifier,
            ApplicationEventPublisher eventPublisher,
            TransactionTemplate transactionTemplate
    ) {
        this.userRepository = userRepository;
        this.memberRepository = memberRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.googleOAuthVerifier = googleOAuthVerifier;
        this.eventPublisher = eventPublisher;
        this.transactionTemplate = transactionTemplate;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw BusinessException.conflict("EMAIL_ALREADY_IN_USE", "Usuário já cadastrado com este email.");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setNickname(blankToNull(request.nickname()));
        user.setEmail(normalizedEmail);
        user.setPhoneNumber(blankToNull(request.phoneNumber()));
        user.setProfilePictureUrl(blankToNull(request.profilePictureUrl()));
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setProvider("email");
        user.setStatus("active");
        user.setLastLogin(OffsetDateTime.now());
        user = userRepository.save(user);
        if (user.getFirebaseUid() == null) {
            user.setFirebaseUid(user.getUid().toString());
            user = userRepository.save(user);
        }

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> BusinessException.unauthorized("INVALID_CREDENTIALS", "Email ou senha incorretos."));

        if (!"active".equalsIgnoreCase(user.getStatus())) {
            throw BusinessException.forbidden("ACCOUNT_DISABLED", "Esta conta foi desativada.");
        }
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw BusinessException.unauthorized("INVALID_CREDENTIALS", "Email ou senha incorretos.");
        }

        user.setLastLogin(OffsetDateTime.now());
        userRepository.save(user);
        return issueTokens(user);
    }

    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleOAuthVerifier.GoogleUserInfo info =
                googleOAuthVerifier.verify(request.idToken(), request.accessToken());

        return transactionTemplate.execute(status -> {
            String normalizedEmail = info.email().trim().toLowerCase();
            User user = userRepository.findByEmailIgnoreCase(normalizedEmail).orElseGet(() -> {
                User created = new User();
                created.setName(info.name());
                created.setEmail(normalizedEmail);
                created.setProfilePictureUrl(info.pictureUrl());
                created.setProvider("google.com");
                created.setFirebaseUid(info.sub() != null && !info.sub().isBlank() ? info.sub() : null);
                created.setStatus("active");
                return created;
            });

            if (!"active".equalsIgnoreCase(user.getStatus())) {
                throw BusinessException.forbidden("ACCOUNT_DISABLED", "Esta conta foi desativada.");
            }
            if (user.getProfilePictureUrl() == null && info.pictureUrl() != null) {
                user.setProfilePictureUrl(info.pictureUrl());
            }
            user.setLastLogin(OffsetDateTime.now());
            user = userRepository.save(user);
            if (user.getFirebaseUid() == null) {
                user.setFirebaseUid(user.getUid().toString());
                user = userRepository.save(user);
            }
            return issueTokens(user);
        });
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        String rawToken = request != null ? request.resolveToken() : null;
        if (rawToken == null) {
            throw BusinessException.unauthorized("MISSING_REFRESH_TOKEN", "Token de renovação ausente.");
        }

        String tokenHash = jwtService.sha256Hex(rawToken);
        RefreshToken stored = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> BusinessException.unauthorized("INVALID_REFRESH_TOKEN", "Token de renovação inválido."));

        if (stored.isRevoked() || stored.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw BusinessException.unauthorized("INVALID_REFRESH_TOKEN", "Token de renovação expirado ou revogado.");
        }
        User user = stored.getUser();
        if (!"active".equalsIgnoreCase(user.getStatus())) {
            throw BusinessException.forbidden("ACCOUNT_DISABLED", "Esta conta foi desativada.");
        }
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
        return issueTokens(user);
    }

    @Transactional
    public void logout(UUID userUid, LogoutRequest request) {
        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            String hash = jwtService.sha256Hex(request.refreshToken().trim());
            refreshTokenRepository.findByTokenHash(hash).ifPresent(rt -> {
                if (rt.getUser().getUid().equals(userUid)) {
                    rt.setRevoked(true);
                    refreshTokenRepository.save(rt);
                }
            });
        } else {
            refreshTokenRepository.revokeAllByUserUid(userUid);
        }
    }

    @Transactional
    public void changePassword(UUID userUid, ChangePasswordRequest request) {
        User user = userRepository.findById(userUid)
                .orElseThrow(() -> BusinessException.notFound("USER_NOT_FOUND", "Usuário não encontrado."));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw BusinessException.badRequest("WRONG_PASSWORD", "Senha atual incorreta.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUserUid(userUid);
    }

    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(normalizedEmail);
        if (userOpt.isEmpty()) {
            return; // Anti-enumeration: always return 200 OK
        }

        User user = userOpt.get();
        Optional<PasswordResetToken> recentOpt =
                passwordResetTokenRepository.findTopByUserUidAndUsedFalseOrderByCreatedAtDesc(user.getUid());
        if (recentOpt.isPresent()
                && recentOpt.get().getCreatedAt().isAfter(OffsetDateTime.now().minusSeconds(RESET_COOLDOWN_SECONDS))) {
            return; // Silent cooldown to protect email quota
        }

        String code = String.format("%06d", secureRandom.nextInt(1_000_000));
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setCodeHash(jwtService.sha256Hex(code));
        resetToken.setExpiresAt(OffsetDateTime.now().plusMinutes(15));
        passwordResetTokenRepository.save(resetToken);

        eventPublisher.publishEvent(new PasswordResetEmailEvent(user.getEmail(), user.getName(), code));
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> BusinessException.badRequest("INVALID_RESET_CODE", "Código inválido ou expirado."));

        PasswordResetToken resetToken = passwordResetTokenRepository
                .findTopByUserUidAndUsedFalseOrderByCreatedAtDesc(user.getUid())
                .orElseThrow(() -> BusinessException.badRequest("INVALID_RESET_CODE", "Código inválido ou expirado."));

        if (resetToken.getExpiresAt().isBefore(OffsetDateTime.now()) || resetToken.getAttempts() >= MAX_RESET_ATTEMPTS) {
            resetToken.setUsed(true);
            passwordResetTokenRepository.save(resetToken);
            throw BusinessException.badRequest("EXPIRED_RESET_CODE", "Código inválido ou expirado. Solicite um novo código.");
        }

        String candidateHash = jwtService.sha256Hex(request.code().trim());
        if (!candidateHash.equals(resetToken.getCodeHash())) {
            resetToken.setAttempts(resetToken.getAttempts() + 1);
            if (resetToken.getAttempts() >= MAX_RESET_ATTEMPTS) {
                resetToken.setUsed(true);
            }
            passwordResetTokenRepository.save(resetToken);
            throw BusinessException.badRequest("INVALID_RESET_CODE", "Código de verificação incorreto.");
        }

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUserUid(user.getUid());
    }

    public AuthResponse issueTokens(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String rawRefreshToken = jwtService.generateOpaqueToken();

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(jwtService.sha256Hex(rawRefreshToken));
        refreshToken.setExpiresAt(OffsetDateTime.now().plusNanos(jwtService.getRefreshExpirationMs() * 1_000_000L));
        refreshTokenRepository.save(refreshToken);

        boolean isAdmin = resolveIsAdmin(user);
        return new AuthResponse(accessToken, rawRefreshToken, UserDTO.from(user, isAdmin));
    }

    public boolean resolveIsAdmin(User user) {
        if (user.getCurrentHouseId() == null) {
            return false;
        }
        return memberRepository
                .findByHouseIdAndUserUidAndStatus(user.getCurrentHouseId(), user.getUid(), "ACTIVE")
                .map(m -> m.isAdmin() || m.isOwner() || (m.getHouse() != null && m.getHouse().isAllMembersAdmin()))
                .orElse(false);
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
