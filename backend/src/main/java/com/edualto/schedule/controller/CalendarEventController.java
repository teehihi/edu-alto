package com.edualto.schedule.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.schedule.dto.CalendarEventRequest;
import com.edualto.schedule.dto.CalendarEventResponse;
import com.edualto.schedule.service.CalendarEventService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/calendar-events")
public class CalendarEventController {
    private final CalendarEventService service;

    public CalendarEventController(CalendarEventService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Xem sự kiện lịch cá nhân trong khoảng thời gian giới hạn")
    public ApiResponse<List<CalendarEventResponse>> list(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam OffsetDateTime from,
            @RequestParam OffsetDateTime to) {
        return ApiResponse.ok(service.list(principal.id(), from, to));
    }

    @PostMapping
    @Operation(summary = "Tạo sự kiện lịch cá nhân")
    public ApiResponse<CalendarEventResponse> create(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @Valid @RequestBody CalendarEventRequest request) {
        return ApiResponse.ok(service.create(principal.id(), request));
    }

    @GetMapping("/{eventId}")
    @Operation(summary = "Xem chi tiết sự kiện lịch cá nhân")
    public ApiResponse<CalendarEventResponse> get(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID eventId) {
        return ApiResponse.ok(service.get(principal.id(), eventId));
    }

    @PutMapping("/{eventId}")
    @Operation(summary = "Cập nhật sự kiện lịch cá nhân")
    public ApiResponse<CalendarEventResponse> update(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID eventId,
            @Valid @RequestBody CalendarEventRequest request) {
        return ApiResponse.ok(service.update(principal.id(), eventId, request));
    }

    @DeleteMapping("/{eventId}")
    @Operation(summary = "Xóa sự kiện lịch cá nhân")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable UUID eventId) {
        service.delete(principal.id(), eventId);
        return ApiResponse.ok();
    }
}
