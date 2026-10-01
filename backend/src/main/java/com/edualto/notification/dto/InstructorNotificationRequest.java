package com.edualto.notification.dto;

import com.edualto.notification.domain.NotificationAudience;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record InstructorNotificationRequest(
        @NotBlank(message = "Tiêu đề thông báo không được để trống")
        @Size(max = 255, message = "Tiêu đề thông báo tối đa 255 ký tự")
        String title,
        @NotBlank(message = "Nội dung thông báo không được để trống")
        @Size(max = 5000, message = "Nội dung thông báo tối đa 5.000 ký tự")
        String description,
        @Size(max = 2048, message = "Đường dẫn tối đa 2.048 ký tự")
        String linkUrl,
        @NotNull(message = "Đối tượng nhận không được để trống")
        NotificationAudience audience,
        @Size(max = 512, message = "Mã ảnh tối đa 512 ký tự")
        String imageKey,
        Instant startsAt,
        Instant endsAt
) { }
