package com.edualto.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateCurrentUserRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên")
        @Size(max = 160, message = "Họ và tên không được vượt quá 160 ký tự")
        String fullName
) {
}
