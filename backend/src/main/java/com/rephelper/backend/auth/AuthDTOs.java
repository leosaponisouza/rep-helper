package com.rephelper.backend.auth;

import com.rephelper.backend.user.UserDTO;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDTOs {

    private AuthDTOs() {}

    public record SignupRequest(
            @NotBlank(message = "Nome é obrigatório")
            @Size(max = 120)
            String name,
            @Size(max = 60)
            String nickname,
            @NotBlank(message = "Email é obrigatório")
            @Email(message = "Email inválido")
            String email,
            @Size(max = 30)
            String phoneNumber,
            @Size(max = 500)
            String profilePictureUrl,
            @NotBlank(message = "Senha é obrigatória")
            @Size(min = 8, max = 128, message = "A senha deve ter no mínimo 8 caracteres")
            String password
    ) {}

    public record LoginRequest(
            @NotBlank(message = "Email é obrigatório")
            @Email(message = "Email inválido")
            String email,
            @NotBlank(message = "Senha é obrigatória")
            String password
    ) {}

    public record GoogleLoginRequest(
            String idToken,
            String accessToken
    ) {}

    public record RefreshRequest(
            String refreshToken,
            String token
    ) {
        public String resolveToken() {
            if (refreshToken != null && !refreshToken.isBlank()) return refreshToken.trim();
            if (token != null && !token.isBlank()) return token.trim();
            return null;
        }
    }

    public record LogoutRequest(
            String refreshToken
    ) {}

    public record ChangePasswordRequest(
            @NotBlank(message = "Senha atual é obrigatória")
            String currentPassword,
            @NotBlank(message = "Nova senha é obrigatória")
            @Size(min = 8, max = 128, message = "A nova senha deve ter no mínimo 8 caracteres")
            String newPassword
    ) {}

    public record ForgotPasswordRequest(
            @NotBlank(message = "Email é obrigatório")
            @Email(message = "Email inválido")
            String email
    ) {}

    public record ResetPasswordRequest(
            @NotBlank(message = "Email é obrigatório")
            @Email(message = "Email inválido")
            String email,
            @NotBlank(message = "Código de verificação é obrigatório")
            String code,
            @NotBlank(message = "Nova senha é obrigatória")
            @Size(min = 8, max = 128, message = "A nova senha deve ter no mínimo 8 caracteres")
            String newPassword
    ) {}

    public record AuthResponse(
            String token,
            String refreshToken,
            UserDTO user
    ) {}

    public record MessageResponse(String message) {}
}
