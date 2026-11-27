package com.alpendre.backend;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.alpendre.backend.auth.PasswordResetEmailEvent;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
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
@Import(AbstractIntegrationTest.ResetCaptureConfig.class)
public abstract class AbstractIntegrationTest {

    @TempDir
    protected static Path sharedMediaRoot;

    @DynamicPropertySource
    static void registerMediaRoot(DynamicPropertyRegistry registry) {
        registry.add("app.media.storage-root", () -> sharedMediaRoot.toAbsolutePath().toString());
    }

    @TestConfiguration
    public static class ResetCaptureConfig {
        @Bean
        public ResetCodeHolder resetCodeHolder() {
            return new ResetCodeHolder();
        }
    }

    public static class ResetCodeHolder {
        private final AtomicReference<String> latestCode = new AtomicReference<>();

        @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
        public void onResetEvent(PasswordResetEmailEvent event) {
            latestCode.set(event.code());
        }

        public String latest() {
            return latestCode.get();
        }
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected ResetCodeHolder resetCodeHolder;

    protected record AuthSession(String uid, String email, String token, String refreshToken) {}

    protected record HouseFixture(String id, String code, AuthSession owner) {}

    private static final AtomicInteger IP_SEQ = new AtomicInteger(1);

    protected String uniqueEmail(String prefix) {
        return prefix + "." + UUID.randomUUID().toString().substring(0, 8) + "@alpendre.local";
    }

    protected AuthSession signupUser(String prefix, String name) throws Exception {
        String email = uniqueEmail(prefix);
        int seq = IP_SEQ.getAndIncrement();
        String clientIp = "10.0." + ((seq / 250) % 250) + "." + ((seq % 250) + 1);
        MvcResult result = mockMvc.perform(post("/api/v1/auth/signup")
                        .with(req -> {
                            req.setRemoteAddr(clientIp);
                            return req;
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", name,
                                "nickname", name.split(" ")[0],
                                "email", email,
                                "password", "SenhaForte123"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode json = readJson(result);
        return new AuthSession(
                json.get("user").get("uid").asText(),
                email,
                json.get("token").asText(),
                json.get("refreshToken").asText()
        );
    }

    protected HouseFixture createHouse(String ownerPrefix, String houseName) throws Exception {
        AuthSession owner = signupUser(ownerPrefix, "Owner " + ownerPrefix);
        MvcResult res = mockMvc.perform(post("/api/v1/houses")
                        .header("Authorization", bearer(owner.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", houseName,
                                "street", "Rua das Flores",
                                "number", "100",
                                "neighborhood", "Centro",
                                "city", "São Carlos",
                                "state", "SP",
                                "zipCode", "13560-000",
                                "presetType", "REPUBLIC"
                        ))))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode json = readJson(res);
        AuthSession updatedOwner = new AuthSession(
                owner.uid(),
                owner.email(),
                json.hasNonNull("token") ? json.get("token").asText() : owner.token(),
                json.hasNonNull("refreshToken") ? json.get("refreshToken").asText() : owner.refreshToken()
        );
        return new HouseFixture(
                json.get("house").get("id").asText(),
                json.get("house").get("code").asText(),
                updatedOwner
        );
    }

    protected AuthSession joinHouse(String memberPrefix, String inviteCode) throws Exception {
        AuthSession member = signupUser(memberPrefix, "Member " + memberPrefix);
        MvcResult res = mockMvc.perform(post("/api/v1/houses/join")
                        .header("Authorization", bearer(member.token()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("code", inviteCode))))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode json = readJson(res);
        return new AuthSession(
                member.uid(),
                member.email(),
                json.hasNonNull("token") ? json.get("token").asText() : member.token(),
                json.hasNonNull("refreshToken") ? json.get("refreshToken").asText() : member.refreshToken()
        );
    }

    protected String bearer(String token) {
        return "Bearer " + token;
    }

    protected JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }
}
