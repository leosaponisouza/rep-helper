package com.rephelper.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rephelper.backend.auth.PasswordResetEmailEvent;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(RepHelperBackendIntegrationTest.TestEventCaptureConfig.class)
class RepHelperBackendIntegrationTest {

    @TempDir
    static Path tempMediaRoot;

    @DynamicPropertySource
    static void registerMediaRoot(DynamicPropertyRegistry registry) {
        registry.add("app.media.storage-root", () -> tempMediaRoot.toAbsolutePath().toString());
    }

    @TestConfiguration
    static class TestEventCaptureConfig {
        @Bean
        ResetCodeCapture resetCodeCapture() {
            return new ResetCodeCapture();
        }
    }

    static class ResetCodeCapture {
        private final AtomicReference<String> latestCode = new AtomicReference<>();

        @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
        public void onPasswordResetRequested(PasswordResetEmailEvent event) {
            latestCode.set(event.code());
        }

        public String getLatestCode() {
            return latestCode.get();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ResetCodeCapture resetCodeCapture;

    @Test
    void healthEndpointShouldReportDatabaseUp() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.database").value("UP"))
                .andExpect(jsonPath("$.storage").value("UP"));
    }

    @Test
    void authSignupLoginRefreshAndPasswordResetLifecycle() throws Exception {
        String email = "alice.auth@rephelper.local";
        MvcResult signupRes = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Alice Silva",
                                "nickname", "Ali",
                                "email", email,
                                "password", "SenhaForte123"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(email))
                .andReturn();

        JsonNode signupJson = readJson(signupRes);
        String firstRefresh = signupJson.get("refreshToken").asText();

        MvcResult refreshRes = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("refreshToken", firstRefresh))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn();

        String rotatedRefresh = readJson(refreshRes).get("refreshToken").asText();
        assertThat(rotatedRefresh).isNotEqualTo(firstRefresh);

        // Old refresh token must be revoked after rotation
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("refreshToken", firstRefresh))))
                .andExpect(status().isUnauthorized());

        // Password reset 2-step flow
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email))))
                .andExpect(status().isOk());

        String code = resetCodeCapture.getLatestCode();
        assertThat(code).matches("^\\d{6}$");

        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "code", code,
                                "newPassword", "NovaSenha456"
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "password", "NovaSenha456"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void mediaUploadEnforcesMagicBytesAndServesValidImages() throws Exception {
        String token = signupAndGetToken("media.user@rephelper.local", "Media User");

        MockMultipartFile spoofed = new MockMultipartFile(
                "file",
                "fake.png",
                MediaType.IMAGE_PNG_VALUE,
                "not-really-a-png-file".getBytes(StandardCharsets.UTF_8)
        );
        mockMvc.perform(multipart("/api/v1/media/receipts")
                        .file(spoofed)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));

        byte[] validPng = new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 1};
        MockMultipartFile validFile = new MockMultipartFile(
                "file",
                "receipt.png",
                MediaType.IMAGE_PNG_VALUE,
                validPng
        );

        MvcResult uploadRes = mockMvc.perform(multipart("/api/v1/media/receipts")
                        .file(validFile)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bucket").value("receipts"))
                .andReturn();

        String url = readJson(uploadRes).get("url").asText();
        String publicPath = url.substring(url.indexOf("/api/v1/media/public/"));
        mockMvc.perform(get(publicPath))
                .andExpect(status().isOk());
    }

    @Test
    void republicJoinRecurringTaskAndFinanceBalanceInvariants() throws Exception {
        String ownerToken = signupAndGetToken("owner.house@rephelper.local", "Owner");
        String memberToken = signupAndGetToken("member.house@rephelper.local", "Member");

        // Owner creates republic
        MvcResult createRepRes = mockMvc.perform(post("/api/v1/republics")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "República Central",
                                "street", "Rua das Flores",
                                "number", "100",
                                "neighborhood", "Centro",
                                "city", "São Carlos",
                                "state", "SP",
                                "zipCode", "13560-000"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.republic.code").isNotEmpty())
                .andReturn();

        JsonNode repJson = readJson(createRepRes);
        String republicId = repJson.get("republic").get("id").asText();
        String inviteCode = repJson.get("republic").get("code").asText();
        ownerToken = repJson.get("token").asText();

        // Member joins by invite code
        MvcResult joinRes = mockMvc.perform(post("/api/v1/republics/join")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("code", inviteCode))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.republic.id").value(republicId))
                .andReturn();

        String memberUid = readJson(joinRes).get("user").get("uid").asText();

        // Recurring task creation and completion
        MvcResult taskRes = mockMvc.perform(post("/api/v1/tasks")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "republicId", republicId,
                                "title", "Limpar Cozinha",
                                "dueDate", "2026-11-10T10:00:00Z",
                                "recurring", true,
                                "recurrenceType", "WEEKLY",
                                "recurrenceInterval", 1,
                                "assigned_users", List.of(memberUid)
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();

        long taskId = readJson(taskRes).get("id").asLong();

        mockMvc.perform(post("/api/v1/tasks/" + taskId + "/complete")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        // Completing twice must remain idempotent without spawning duplicates
        mockMvc.perform(post("/api/v1/tasks/" + taskId + "/complete")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        MvcResult listTasksRes = mockMvc.perform(get("/api/v1/tasks?republicId=" + republicId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode allTasks = readJson(listTasksRes);
        assertThat(allTasks.size()).isEqualTo(2);
        long pendingCount = 0;
        for (JsonNode t : allTasks) {
            if ("PENDING".equals(t.get("status").asText())) {
                pendingCount++;
                assertThat(t.get("parentTaskId").asLong()).isEqualTo(taskId);
            }
        }
        assertThat(pendingCount).isEqualTo(1);

        // Finance invariants: Income adds immediately; Expense deducts ONLY on REIMBURSED; reset reverses
        mockMvc.perform(post("/api/v1/incomes")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Mensalidade Novembro",
                                "amount", 500.00,
                                "incomeDate", "2026-11-05T12:00:00Z",
                                "source", "RATEIO",
                                "republicId", republicId
                        ))))
                .andExpect(status().isCreated());

        MvcResult expenseRes = mockMvc.perform(post("/api/v1/expenses")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "description", "Conta de Luz",
                                "amount", 120.00,
                                "expenseDate", "2026-11-06T12:00:00Z",
                                "category", "UTILIDADES",
                                "republicId", republicId
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn();

        long expenseId = readJson(expenseRes).get("id").asLong();

        // Still 500.00 before reimburse
        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + republicId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(500.0));

        mockMvc.perform(post("/api/v1/expenses/" + expenseId + "/approve")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        // Still 500.00 while APPROVED
        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + republicId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(500.0));

        mockMvc.perform(post("/api/v1/expenses/" + expenseId + "/reimburse")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REIMBURSED"));

        // Deducted after REIMBURSED -> 380.00
        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + republicId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(380.0));

        // Reset REIMBURSED -> PENDING reverses back to 500.00
        mockMvc.perform(post("/api/v1/expenses/" + expenseId + "/reset")
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));

        mockMvc.perform(get("/api/v1/financial-dashboard/summary/" + republicId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(500.0));

        // adjust-balance sets exact target balance (1000.00)
        mockMvc.perform(post("/api/v1/finances/" + republicId + "/adjust-balance")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "amount", 1000.00,
                                "description", "Fechamento inicial"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBalance").value(1000.0));

        // Event create & invite check
        mockMvc.perform(post("/api/v1/events")
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Churrasco",
                                "description", "Integração dos moradores",
                                "startDate", "2026-12-01T18:00:00Z",
                                "endDate", "2026-12-01T23:00:00Z",
                                "location", "Área gourmet",
                                "republicId", republicId,
                                "invitedUserIds", List.of(memberUid)
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.invitations.length()").value(2));
    }

    private String signupAndGetToken(String email, String name) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", name,
                                "email", email,
                                "password", "SenhaSegura123"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        return readJson(result).get("token").asText();
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
