package com.edualto.schedule.dto;

import com.edualto.schedule.domain.CalendarEventStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CalendarEventRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 10000) String description,
        UUID courseId,
        @NotNull OffsetDateTime startsAt,
        @NotNull OffsetDateTime endsAt,
        CalendarEventStatus status
) {
}
