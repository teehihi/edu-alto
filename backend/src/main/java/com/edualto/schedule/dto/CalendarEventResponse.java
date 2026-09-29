package com.edualto.schedule.dto;

import com.edualto.schedule.domain.CalendarEvent;
import com.edualto.schedule.domain.CalendarEventStatus;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CalendarEventResponse(
        UUID id,
        UUID courseId,
        String title,
        String description,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        CalendarEventStatus status,
        Instant createdAt,
        Instant updatedAt
) {
    public static CalendarEventResponse from(CalendarEvent event) {
        return new CalendarEventResponse(event.getId(), event.getCourseId(), event.getTitle(), event.getDescription(),
                event.getStartsAt(), event.getEndsAt(), event.getStatus(), event.getCreatedAt(), event.getUpdatedAt());
    }
}
