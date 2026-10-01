package com.edualto.notification.controller;

import com.edualto.common.api.ApiResponse;
import com.edualto.common.api.PageMeta;
import com.edualto.common.security.AuthenticatedUser;
import com.edualto.notification.dto.LearnerInstructorAnnouncementResponse;
import com.edualto.notification.service.InstructorNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Instructor Announcements", description = "Thông báo giảng viên dành cho học viên")
public class LearnerInstructorAnnouncementController {
    private final InstructorNotificationService notifications;

    public LearnerInstructorAnnouncementController(InstructorNotificationService notifications) {
        this.notifications = notifications;
    }

    @GetMapping("/api/v1/me/instructor-announcements")
    @Operation(summary = "Danh sách thông báo giảng viên dành cho học viên")
    public ApiResponse<List<LearnerInstructorAnnouncementResponse>> list(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<LearnerInstructorAnnouncementResponse> result = notifications
                .listActiveAnnouncements(principal.id(), page, size);
        return ApiResponse.page(result.getContent(), new PageMeta(result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages()));
    }
}
