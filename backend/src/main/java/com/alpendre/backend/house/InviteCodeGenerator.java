package com.alpendre.backend.house;

import java.util.UUID;
import java.util.function.Predicate;
import org.springframework.stereotype.Component;

@Component
public class InviteCodeGenerator {

    public static final int CODE_SIZE = 6;

    public String allocate(Predicate<String> alreadyExists) {
        for (int tries = 0; tries < 25; tries++) {
            String candidate = UUID.randomUUID()
                    .toString()
                    .replace("-", "")
                    .substring(0, CODE_SIZE)
                    .toUpperCase();
            if (!alreadyExists.test(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Exhausted attempts to generate invite code");
    }
}
