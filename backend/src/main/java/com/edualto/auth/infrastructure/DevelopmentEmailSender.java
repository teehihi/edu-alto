package com.edualto.auth.infrastructure;

import com.edualto.auth.domain.OtpPurpose;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class DevelopmentEmailSender implements EmailSender {

    private static final Logger log = LoggerFactory.getLogger(DevelopmentEmailSender.class);

    @Override
    public void sendOtp(String recipientEmail, OtpPurpose purpose, String otp) {
        log.info("Đã tạo OTP {} cho email {}. Cấu hình nhà cung cấp email thật sẽ được bổ sung trước production.", purpose, recipientEmail);
    }
}
