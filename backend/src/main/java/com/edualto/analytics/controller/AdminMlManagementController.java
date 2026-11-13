package com.edualto.analytics.controller;

import com.edualto.analytics.dto.AdminMlRetrainResponse;
import com.edualto.analytics.dto.AdminMlStatusResponse;
import com.edualto.analytics.service.MlModelManagementService;
import com.edualto.common.api.ApiResponse;
import com.edualto.common.security.AuthenticatedUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/ml")
@Tag(name = "Admin ML", description = "Quản lý và điều phối mô hình học máy dự đoán kết quả học tập")
public class AdminMlManagementController {

    private final MlModelManagementService mlModelManagementService;

    public AdminMlManagementController(MlModelManagementService mlModelManagementService) {
        this.mlModelManagementService = mlModelManagementService;
    }

    @PostMapping("/retrain")
    @Operation(summary = "Quản trị viên kích hoạt huấn luyện lại mô hình học máy thủ công")
    public ApiResponse<AdminMlRetrainResponse> triggerRetrain(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        AdminMlRetrainResponse response = mlModelManagementService.triggerManualRetrain(principal.id());
        return ApiResponse.ok(response);
    }

    @GetMapping("/status")
    @Operation(summary = "Quản trị viên xem trạng thái hiện tại và siêu dữ liệu của mô hình học máy")
    public ApiResponse<AdminMlStatusResponse> getStatus(
            @AuthenticationPrincipal AuthenticatedUser principal
    ) {
        AdminMlStatusResponse response = mlModelManagementService.getStatus(principal.id());
        return ApiResponse.ok(response);
    }
}
