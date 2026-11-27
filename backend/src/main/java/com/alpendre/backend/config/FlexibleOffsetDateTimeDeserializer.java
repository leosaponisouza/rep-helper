package com.alpendre.backend.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;

/**
 * Parses ISO-8601 date-times with offset/Z (Tasks, Finances),
 * local date-times without offset (Events formatToBackendDateTime),
 * and date-only strings into UTC OffsetDateTime.
 */
public class FlexibleOffsetDateTimeDeserializer extends JsonDeserializer<OffsetDateTime> {

    @Override
    public OffsetDateTime deserialize(JsonParser parser, DeserializationContext ctxt) throws IOException {
        String raw = parser.getText();
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String value = raw.trim();
        try {
            return OffsetDateTime.parse(value);
        } catch (DateTimeParseException ignored) {
            // Try local date-time without offset
        }
        try {
            return LocalDateTime.parse(value).atOffset(ZoneOffset.UTC);
        } catch (DateTimeParseException ignored) {
            // Try date-only format
        }
        return LocalDate.parse(value).atStartOfDay().atOffset(ZoneOffset.UTC);
    }
}
