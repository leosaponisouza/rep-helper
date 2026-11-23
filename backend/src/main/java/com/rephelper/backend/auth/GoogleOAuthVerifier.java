package com.rephelper.backend.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rephelper.backend.common.BusinessException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class GoogleOAuthVerifier {

    public record GoogleUserInfo(String sub, String email, String name, String pictureUrl) {}

    private static final String GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
    private static final String GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
    private static final Duration JWKS_TTL = Duration.ofHours(1);
    private static final Duration MIN_JWKS_RELOAD_INTERVAL = Duration.ofSeconds(60);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final Set<String> allowedClientIds;
    private final Object jwksLock = new Object();

    private volatile Map<String, RSAPublicKey> cachedKeys = Map.of();
    private volatile Instant cacheExpiresAt = Instant.EPOCH;
    private volatile Instant lastFetchAt = Instant.EPOCH;

    public GoogleOAuthVerifier(
            ObjectMapper objectMapper,
            @Value("${app.google.client-ids:}") String clientIds
    ) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
        this.allowedClientIds = Arrays.stream(clientIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    public GoogleUserInfo verify(String idToken, String accessToken) {
        if (idToken != null && !idToken.isBlank()) {
            return verifyIdToken(idToken.trim());
        }
        if (accessToken != null && !accessToken.isBlank()) {
            return verifyAccessToken(accessToken.trim());
        }
        throw BusinessException.badRequest("GOOGLE_TOKEN_MISSING", "Token do Google não informado.");
    }

    private GoogleUserInfo verifyIdToken(String idToken) {
        try {
            String[] parts = idToken.split("\\.");
            if (parts.length != 3) {
                throw BusinessException.unauthorized("INVALID_GOOGLE_TOKEN", "Formato de idToken Google inválido.");
            }
            byte[] headerBytes = Base64.getUrlDecoder().decode(parts[0]);
            JsonNode header = objectMapper.readTree(headerBytes);
            String kid = header.path("kid").asText("");
            String alg = header.path("alg").asText("");
            if (kid.isBlank() || !"RS256".equals(alg)) {
                throw BusinessException.unauthorized("INVALID_GOOGLE_TOKEN", "Cabeçalho do idToken Google inválido.");
            }

            RSAPublicKey publicKey = resolveGooglePublicKey(kid);
            Claims claims = Jwts.parser()
                    .verifyWith(publicKey)
                    .build()
                    .parseSignedClaims(idToken)
                    .getPayload();

            String issuer = claims.getIssuer();
            if (!"https://accounts.google.com".equals(issuer) && !"accounts.google.com".equals(issuer)) {
                throw BusinessException.unauthorized("INVALID_GOOGLE_TOKEN", "Emissor do token Google inválido.");
            }

            Set<String> audiences = claims.getAudience();
            if (!allowedClientIds.isEmpty()
                    && (audiences == null || audiences.stream().noneMatch(allowedClientIds::contains))) {
                throw BusinessException.unauthorized("INVALID_GOOGLE_AUDIENCE", "Cliente Google não autorizado.");
            }

            Object verifiedClaim = claims.get("email_verified");
            boolean emailVerified = verifiedClaim instanceof Boolean b
                    ? b
                    : "true".equalsIgnoreCase(String.valueOf(verifiedClaim));
            String email = claims.get("email", String.class);
            if (!emailVerified || email == null || email.isBlank()) {
                throw BusinessException.unauthorized("GOOGLE_EMAIL_UNVERIFIED", "E-mail da conta Google não verificado.");
            }

            String name = claims.get("name", String.class);
            String resolvedName = (name != null && !name.isBlank()) ? name : email.split("@")[0];
            String picture = claims.get("picture", String.class);
            String sub = claims.getSubject() != null ? claims.getSubject() : "";
            return new GoogleUserInfo(sub, email, resolvedName, picture);
        } catch (BusinessException ex) {
            throw ex;
        } catch (JwtException | IllegalArgumentException ex) {
            throw BusinessException.unauthorized("INVALID_GOOGLE_TOKEN", "Token do Google inválido ou expirado.");
        } catch (Exception ex) {
            throw BusinessException.unauthorized("GOOGLE_VERIFY_FAILED", "Não foi possível validar o login com Google.");
        }
    }

    private RSAPublicKey resolveGooglePublicKey(String kid) throws Exception {
        Instant now = Instant.now();
        Map<String, RSAPublicKey> snapshot = cachedKeys;
        if (now.isBefore(cacheExpiresAt) && snapshot.containsKey(kid)) {
            return snapshot.get(kid);
        }

        synchronized (jwksLock) {
            now = Instant.now();
            if (now.isBefore(cacheExpiresAt) && cachedKeys.containsKey(kid)) {
                return cachedKeys.get(kid);
            }
            if (!now.isAfter(lastFetchAt.plus(MIN_JWKS_RELOAD_INTERVAL)) && !cachedKeys.isEmpty()) {
                RSAPublicKey key = cachedKeys.get(kid);
                if (key == null) {
                    throw BusinessException.unauthorized("INVALID_GOOGLE_TOKEN", "Chave pública Google não encontrada.");
                }
                return key;
            }
            Map<String, RSAPublicKey> refreshed = fetchJwksKeys();
            cachedKeys = refreshed;
            lastFetchAt = now;
            cacheExpiresAt = now.plus(JWKS_TTL);
            RSAPublicKey key = refreshed.get(kid);
            if (key == null) {
                throw BusinessException.unauthorized("INVALID_GOOGLE_TOKEN", "Chave pública Google não reconhecida.");
            }
            return key;
        }
    }

    private Map<String, RSAPublicKey> fetchJwksKeys() throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GOOGLE_JWKS_URL))
                .timeout(Duration.ofSeconds(5))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw BusinessException.unauthorized("GOOGLE_VERIFY_FAILED", "Falha ao obter chaves públicas do Google.");
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode keysNode = root.path("keys");
        Map<String, RSAPublicKey> parsed = new HashMap<>();
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        Base64.Decoder urlDecoder = Base64.getUrlDecoder();

        for (JsonNode item : keysNode) {
            if (!"RSA".equals(item.path("kty").asText())) {
                continue;
            }
            String kid = item.path("kid").asText("");
            String n = item.path("n").asText("");
            String e = item.path("e").asText("");
            if (kid.isBlank() || n.isBlank() || e.isBlank()) {
                continue;
            }
            BigInteger modulus = new BigInteger(1, urlDecoder.decode(n));
            BigInteger exponent = new BigInteger(1, urlDecoder.decode(e));
            RSAPublicKey publicKey = (RSAPublicKey) keyFactory.generatePublic(new RSAPublicKeySpec(modulus, exponent));
            parsed.put(kid, publicKey);
        }
        return Map.copyOf(parsed);
    }

    private GoogleUserInfo verifyAccessToken(String accessToken) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(GOOGLE_USERINFO_URL))
                    .timeout(Duration.ofSeconds(5))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw BusinessException.unauthorized("INVALID_GOOGLE_TOKEN", "Token do Google inválido ou expirado.");
            }
            JsonNode node = objectMapper.readTree(response.body());
            boolean emailVerified = node.path("email_verified").asBoolean(false);
            String email = node.path("email").asText("");
            if (!emailVerified || email.isBlank()) {
                throw BusinessException.unauthorized("GOOGLE_EMAIL_UNVERIFIED", "E-mail da conta Google não verificado.");
            }
            return new GoogleUserInfo(
                    node.path("sub").asText(""),
                    email,
                    node.path("name").asText(email.split("@")[0]),
                    node.path("picture").asText(null)
            );
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw BusinessException.unauthorized("GOOGLE_VERIFY_FAILED", "Não foi possível validar o login com Google.");
        }
    }
}
