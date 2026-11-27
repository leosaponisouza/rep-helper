package com.alpendre.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class HttpEmailSenderAdapter implements EmailSenderPort {

    private static final Logger log = LoggerFactory.getLogger(HttpEmailSenderAdapter.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String providerUrl;
    private final String apiKey;
    private final String fromAddress;

    public HttpEmailSenderAdapter(
            ObjectMapper objectMapper,
            @Value("${app.email.provider-url:https://api.resend.com/emails}") String providerUrl,
            @Value("${app.email.api-key:}") String apiKey,
            @Value("${app.email.from-address:no-reply@alpendre.app}") String fromAddress
    ) {
        this.objectMapper = objectMapper;
        this.providerUrl = providerUrl;
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.fromAddress = fromAddress;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPasswordResetRequested(PasswordResetEmailEvent event) {
        sendPasswordResetCode(event.email(), event.name(), event.code());
    }

    @Override
    public void sendPasswordResetCode(String toEmail, String recipientName, String code) {
        if (apiKey.isEmpty()) {
            log.info("[DEV EMAIL FALLBACK] Password reset code for {} ({}): {}", toEmail, recipientName, code);
            return;
        }
        try {
            String greeting = recipientName != null && !recipientName.isBlank() ? recipientName : "morador";
            Map<String, Object> body = Map.of(
                    "from", fromAddress,
                    "to", List.of(toEmail),
                    "subject", "Alpendre - Código de redefinição de senha",
                    "text", "Olá, " + greeting + ".\n\nSeu código de redefinição de senha do Alpendre é: "
                            + code + "\n\nEste código expira em 15 minutos."
            );
            String json = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(providerUrl))
                    .timeout(Duration.ofSeconds(5))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.error("Email provider rejected password reset dispatch (status={}): {}",
                        response.statusCode(), response.body());
            } else {
                log.info("Password reset email dispatched to {} (status={})", toEmail, response.statusCode());
            }
        } catch (Exception ex) {
            log.error("Failed to dispatch password reset email to {}", toEmail, ex);
        }
    }
}
