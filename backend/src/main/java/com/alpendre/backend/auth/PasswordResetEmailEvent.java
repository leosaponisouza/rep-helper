package com.alpendre.backend.auth;

public record PasswordResetEmailEvent(String email, String name, String code) {
}
