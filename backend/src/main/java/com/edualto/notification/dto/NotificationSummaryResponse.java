package com.edualto.notification.dto;

import java.util.List;

public record NotificationSummaryResponse(
        List<NotificationResponse> items,
        long unreadCount,
        long total
) {
}
