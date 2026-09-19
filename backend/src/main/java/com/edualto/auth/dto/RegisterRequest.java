package com.edualto.auth.dto;

import com.edualto.user.domain.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên")
        @Size(max = 160, message = "Họ và tên không được vượt quá 160 ký tự")
        String fullName,

        @NotBlank(message = "Vui lòng nhập email")
        @Email(message = "Email không hợp lệ")
        String email,

        @NotBlank(message = "Vui lòng nhập mật khẩu")
        @Size(min = 8, max = 72, message = "Mật khẩu phải có từ 8 đến 72 ký tự")
        @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "Mật khẩu phải có chữ và số")
        String password,

        @NotBlank(message = "Vui lòng xác nhận mật khẩu")
        String confirmPassword,

        RoleName role,

        String learningGoal,

        @Size(max = 255, message = "Chuyên môn không được vượt quá 255 ký tự")
        String expertise,

        String bio
) {
}
