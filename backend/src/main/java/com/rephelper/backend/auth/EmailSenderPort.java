package com.rephelper.backend.auth;

public interface EmailSenderPort {
    void sendPasswordResetCode(String toEmail, String recipientName, String code);
}
