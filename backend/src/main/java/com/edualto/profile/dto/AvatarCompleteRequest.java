package com.edualto.profile.dto;

import jakarta.validation.constraints.NotBlank;

public record AvatarCompleteRequest(
        @NotBlank(message = "Mã tệp (object key) không được để trống")
        String objectKey
) {
}
