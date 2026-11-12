package com.edualto.support.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ContactMessageRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên")
        @Size(max = 120, message = "Họ và tên không được vượt quá 120 ký tự")
        String fullName,

        @NotBlank(message = "Vui lòng nhập email")
        @Email(message = "Email không đúng định dạng")
        @Size(max = 255, message = "Email không được vượt quá 255 ký tự")
        String email,

        @NotBlank(message = "Vui lòng nhập nội dung lời nhắn")
        @Size(min = 10, max = 2000, message = "Nội dung lời nhắn phải từ 10 đến 2000 ký tự")
        String message
) {
}
