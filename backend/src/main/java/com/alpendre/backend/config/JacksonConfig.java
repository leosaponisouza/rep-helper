package com.alpendre.backend.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.time.OffsetDateTime;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jacksonCustomizer() {
        return builder -> {
            builder.deserializerByType(OffsetDateTime.class, new FlexibleOffsetDateTimeDeserializer());
            builder.featuresToDisable(
                    SerializationFeature.WRITE_DATES_AS_TIMESTAMPS,
                    DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES
            );
        };
    }
}
