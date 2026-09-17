package com.edualto.auth.infrastructure;

import com.edualto.auth.domain.OtpPurpose;

public interface EmailSender {

    void sendOtp(String recipientEmail, OtpPurpose purpose, String otp);
}
