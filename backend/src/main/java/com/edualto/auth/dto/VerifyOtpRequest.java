package com.edualto.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyOtpRequest(
        @NotBlank(message = "Vui lòng nhập email")
        @Email(message = "Email không hợp lệ")
        String email,

        @NotBlank(message = "Vui lòng nhập OTP")
        @Pattern(regexp = "^\\d{6}$", message = "OTP phải gồm 6 chữ số")
        String otp
) {
}
