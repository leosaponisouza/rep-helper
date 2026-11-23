package com.rephelper.backend.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rephelper.backend.AbstractIntegrationTest;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class AuthSecurityIntegrationTest extends AbstractIntegrationTest {

    @Test
    void shouldRejectUnauthenticatedAccessToProtectedEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/tasks"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldRejectDuplicateEmailOnSignup() throws Exception {
        AuthSession existing = signupUser("dup", "Duplicate User");

        mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Another User",
                                "email", existing.email(),
                                "password", "SenhaForte123"
                        ))))
                .andExpect(status().isConflict());
    }

    @Test
    void shouldRejectInvalidCredentialsOnLogin() throws Exception {
        AuthSession existing = signupUser("badlogin", "Bad Login");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", existing.email(),
                                "password", "WrongPassword999"
                        ))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldChangePasswordAndRejectOldPassword() throws Exception {
        AuthSession session = signupUser("chgpass", "Change Password");

        // Wrong current password must be rejected
        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", bearer(session.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "currentPassword", "WrongCurrent123",
                                "newPassword", "NovaSenha789!"
                        ))))
                .andExpect(status().isBadRequest());

        // Valid change password
        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", bearer(session.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "currentPassword", "SenhaForte123",
                                "newPassword", "NovaSenha789!"
                        ))))
                .andExpect(status().isOk());

        // Old password fails, new password succeeds
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", session.email(),
                                "password", "SenhaForte123"
                        ))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", session.email(),
                                "password", "NovaSenha789!"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void shouldRejectInvalidPasswordResetCode() throws Exception {
        AuthSession session = signupUser("badreset", "Bad Reset");

        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", session.email()))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", session.email(),
                                "code", "000000",
                                "newPassword", "NovaSenha789!"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldLogoutAndRevokeRefreshToken() throws Exception {
        AuthSession session = signupUser("logout", "Logout User");

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", bearer(session.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("refreshToken", session.refreshToken()))))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("refreshToken", session.refreshToken()))))
                .andExpect(status().isUnauthorized());
    }
}
