package com.edualto.schedule.repository;

import com.edualto.schedule.domain.CalendarEvent;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {
    List<CalendarEvent> findAllByUserIdAndStartsAtLessThanAndEndsAtGreaterThanOrderByStartsAtAsc(
            UUID userId, OffsetDateTime to, OffsetDateTime from);

    Optional<CalendarEvent> findByIdAndUserId(UUID id, UUID userId);
}
