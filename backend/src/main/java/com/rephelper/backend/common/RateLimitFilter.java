package com.rephelper.backend.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;
    private static final long CLEANUP_INTERVAL_MS = 60_000L;
    private static final int AUTH_MAX_REQUESTS = 20;
    private static final int MEDIA_MAX_REQUESTS = 30;

    private final Map<String, Deque<Long>> requestLogs = new ConcurrentHashMap<>();
    private final AtomicLong lastCleanupAt = new AtomicLong(0L);
    private final ObjectMapper objectMapper;

    public RateLimitFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        int limit = resolveLimit(path, request.getMethod());
        if (limit <= 0) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
        String clientKey = clientIp + ":" + (path.startsWith("/api/v1/auth") ? "auth" : "media");
        long now = System.currentTimeMillis();
        evictExpiredBucketsIfDue(now);

        boolean[] allowed = {false};
        requestLogs.compute(clientKey, (k, existing) -> {
            Deque<Long> timestamps = existing != null ? existing : new ArrayDeque<>();
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > WINDOW_MS) {
                timestamps.pollFirst();
            }
            if (timestamps.size() < limit) {
                timestamps.addLast(now);
                allowed[0] = true;
            }
            return timestamps;
        });

        if (!allowed[0]) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            ApiErrorResponse error = new ApiErrorResponse(
                    OffsetDateTime.now(),
                    HttpStatus.TOO_MANY_REQUESTS.value(),
                    "Too Many Requests",
                    "Muitas requisições em pouco tempo. Aguarde um minuto e tente novamente.",
                    "RATE_LIMIT_EXCEEDED",
                    MDC.get(CorrelationIdFilter.MDC_REQUEST_ID),
                    null
            );
            objectMapper.writeValue(response.getOutputStream(), error);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void evictExpiredBucketsIfDue(long now) {
        long previous = lastCleanupAt.get();
        if (now - previous > CLEANUP_INTERVAL_MS && lastCleanupAt.compareAndSet(previous, now)) {
            requestLogs.keySet().forEach(key -> requestLogs.computeIfPresent(key, (k, timestamps) -> {
                while (!timestamps.isEmpty() && now - timestamps.peekFirst() > WINDOW_MS) {
                    timestamps.pollFirst();
                }
                return timestamps.isEmpty() ? null : timestamps;
            }));
        }
    }

    private int resolveLimit(String path, String method) {
        if ("POST".equalsIgnoreCase(method) && path != null) {
            if (path.equals("/api/v1/auth/login")
                    || path.equals("/api/v1/auth/signup")
                    || path.equals("/api/v1/auth/forgot-password")
                    || path.equals("/api/v1/auth/reset-password")) {
                return AUTH_MAX_REQUESTS;
            }
            if (path.startsWith("/api/v1/media/")) {
                return MEDIA_MAX_REQUESTS;
            }
        }
        return 0;
    }
}
