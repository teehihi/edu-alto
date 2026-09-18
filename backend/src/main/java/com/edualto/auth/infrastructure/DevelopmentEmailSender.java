package com.edualto.auth.infrastructure;

import com.edualto.auth.domain.OtpPurpose;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "edualto.mail.enabled", havingValue = "false", matchIfMissing = true)
public class DevelopmentEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(DevelopmentEmailSender.class);

    @Override
    public void sendOtp(String recipientEmail, OtpPurpose purpose, String otp) {
        log.info("Bỏ qua gửi email OTP {} trong môi trường chưa bật SMTP.", purpose);
    }
}
