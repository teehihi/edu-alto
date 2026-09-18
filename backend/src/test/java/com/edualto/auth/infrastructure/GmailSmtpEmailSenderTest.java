package com.edualto.auth.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.edualto.auth.domain.OtpPurpose;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

class GmailSmtpEmailSenderTest {

    private final JavaMailSender mailSender = mock(JavaMailSender.class);
    private final GmailSmtpEmailSender sender = new GmailSmtpEmailSender(
            mailSender,
            "hello@edualto.vn",
            "EduAlto",
            10
    );

    @Test
    void rendersVietnameseVerificationEmail() {
        assertThat(sender.subjectFor(OtpPurpose.EMAIL_VERIFICATION))
                .isEqualTo("Xác thực tài khoản EduAlto");
        assertThat(sender.plainTextFor(OtpPurpose.EMAIL_VERIFICATION, "123456"))
                .contains("xác thực tài khoản EduAlto")
                .contains("123456")
                .contains("10 phút")
                .contains("Vui lòng không chia sẻ mã này");
        assertThat(sender.htmlFor(OtpPurpose.EMAIL_VERIFICATION, "123456"))
                .contains("EduAlto")
                .contains("Xác thực tài khoản EduAlto")
                .contains("123456");
    }

    @Test
    void rendersVietnamesePasswordResetEmail() {
        assertThat(sender.subjectFor(OtpPurpose.PASSWORD_RESET))
                .isEqualTo("Đặt lại mật khẩu EduAlto");
        assertThat(sender.plainTextFor(OtpPurpose.PASSWORD_RESET, "654321"))
                .contains("đặt lại mật khẩu EduAlto")
                .contains("654321");
        assertThat(sender.htmlFor(OtpPurpose.PASSWORD_RESET, "654321"))
                .contains("Đặt lại mật khẩu EduAlto")
                .contains("654321");
    }

    @Test
    void sendsMimeMessageWithoutLoggingOtp() throws Exception {
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(message);

        sender.sendOtp("student@example.com", OtpPurpose.EMAIL_VERIFICATION, "123456");

        verify(mailSender).send(message);
        assertThat(message.getSubject()).isEqualTo("Xác thực tài khoản EduAlto");
        assertThat(message.getAllRecipients()).containsExactly(new InternetAddress("student@example.com"));
    }
}
