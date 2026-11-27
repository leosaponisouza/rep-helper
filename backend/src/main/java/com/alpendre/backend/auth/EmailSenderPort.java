package com.alpendre.backend.auth;

public interface EmailSenderPort {
    void sendPasswordResetCode(String toEmail, String recipientName, String code);
}
