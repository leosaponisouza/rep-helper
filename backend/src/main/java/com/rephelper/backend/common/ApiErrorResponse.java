package com.rephelper.backend.common;

import java.time.OffsetDateTime;
import java.util.Map;

public record ApiErrorResponse(
        OffsetDateTime timestamp,
        int status,
        String error,
        String message,
        String code,
        String requestId,
        Map<String, String> errors
) {
}
