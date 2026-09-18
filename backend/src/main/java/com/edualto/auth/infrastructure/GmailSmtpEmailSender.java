package com.edualto.auth.infrastructure;

import com.edualto.auth.domain.OtpPurpose;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "edualto.mail.enabled", havingValue = "true")
public class GmailSmtpEmailSender implements EmailSender {

    private final JavaMailSender mailSender;
    private final String from;
    private final String senderName;
    private final long ttlMinutes;

    public GmailSmtpEmailSender(
            JavaMailSender mailSender,
            @Value("${edualto.mail.from}") String from,
            @Value("${edualto.mail.sender-name}") String senderName,
            @Value("${edualto.auth.otp.ttl-minutes}") long ttlMinutes
    ) {
        this.mailSender = mailSender;
        this.from = from;
        this.senderName = senderName;
        this.ttlMinutes = ttlMinutes;
    }

    @Override
    public void sendOtp(String recipientEmail, OtpPurpose purpose, String otp) {
        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );
            helper.setFrom(from, senderName);
            helper.setTo(recipientEmail);
            helper.setSubject(subjectFor(purpose));
            helper.setText(plainTextFor(purpose, otp), htmlFor(purpose, otp));
            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException exception) {
            throw new EmailDeliveryException("Không thể gửi email OTP. Vui lòng thử lại sau.", exception);
        }
    }

    String subjectFor(OtpPurpose purpose) {
        return switch (purpose) {
            case EMAIL_VERIFICATION -> "Xác thực tài khoản EduAlto";
            case PASSWORD_RESET -> "Đặt lại mật khẩu EduAlto";
        };
    }

    String plainTextFor(OtpPurpose purpose, String otp) {
        String action = switch (purpose) {
            case EMAIL_VERIFICATION -> "xác thực tài khoản EduAlto";
            case PASSWORD_RESET -> "đặt lại mật khẩu EduAlto";
        };
        return """
                Xin chào,

                Mã OTP để %s của bạn là: %s

                Mã này có hiệu lực trong %d phút. Vui lòng không chia sẻ mã này với bất kỳ ai.

                Trân trọng,
                Đội ngũ EduAlto
                """.formatted(action, otp, ttlMinutes);
    }

    String htmlFor(OtpPurpose purpose, String otp) {
        String title = switch (purpose) {
            case EMAIL_VERIFICATION -> "Xác thực tài khoản EduAlto";
            case PASSWORD_RESET -> "Đặt lại mật khẩu EduAlto";
        };
        String lead = switch (purpose) {
            case EMAIL_VERIFICATION -> "Dùng mã bên dưới để hoàn tất xác thực tài khoản học tập của bạn.";
            case PASSWORD_RESET -> "Dùng mã bên dưới để xác nhận yêu cầu đặt lại mật khẩu.";
        };

        return """
                <!doctype html>
                <html lang="vi">
                <body style="margin:0;background:#F5FBF9;font-family:Arial,sans-serif;color:#101A2C;">
                  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
                    <div style="background:#ffffff;border:1px solid #DDEFE9;border-radius:12px;padding:28px;">
                      <p style="margin:0 0 8px;color:#20B486;font-size:15px;font-weight:700;">EduAlto</p>
                      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#101A2C;">%s</h1>
                      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#667085;">%s</p>
                      <div style="margin:0 0 20px;padding:16px 20px;border-radius:8px;background:#EAF7F3;text-align:center;font-size:32px;letter-spacing:6px;font-weight:700;color:#101A2C;">%s</div>
                      <p style="margin:0;font-size:14px;line-height:1.6;color:#667085;">Mã này có hiệu lực trong %d phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(title, lead, otp, ttlMinutes);
    }
}
