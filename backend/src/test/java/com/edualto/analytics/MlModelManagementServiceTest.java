package com.edualto.analytics;

import com.edualto.analytics.dto.AdminMlRetrainResponse;
import com.edualto.analytics.dto.AdminMlStatusResponse;
import com.edualto.analytics.service.MlModelManagementService;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.service.UserService;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class MlModelManagementServiceTest {

    @Mock
    private UserService userService;

    private ObjectMapper objectMapper;
    private MlModelManagementService service;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new MlModelManagementService(userService, objectMapper, "", false);
    }

    @Test
    void getStatusReturnsModelMetadataAndDefaults() {
        UUID adminId = UUID.randomUUID();
        doNothing().when(userService).requireActiveAdmin(adminId);

        AdminMlStatusResponse response = service.getStatus(adminId);

        verify(userService).requireActiveAdmin(adminId);
        assertThat(response.championModel()).contains("LightGBM");
        assertThat(response.running()).isFalse();
        assertThat(response.status()).isEqualTo("IDLE");
        if (response.rocUtc() != null) {
            assertThat(response.rocUtc()).isGreaterThan(0.9);
            assertThat(response.f1Score()).isGreaterThan(0.9);
        }
    }

    @Test
    void triggerManualRetrainEnforcesAdminAndStartsProcess() {
        UUID adminId = UUID.randomUUID();
        doNothing().when(userService).requireActiveAdmin(adminId);

        AdminMlRetrainResponse response = service.triggerManualRetrain(adminId);

        verify(userService).requireActiveAdmin(adminId);
        assertThat(response.status()).isEqualTo("RUNNING");
        assertThat(response.startedAt()).isNotNull();

        // Calling again immediately while running should throw 409 Conflict
        assertThatThrownBy(() -> service.triggerManualRetrain(adminId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("đang chạy")
                .extracting(e -> ((BusinessException) e).getStatus())
                .isEqualTo(HttpStatus.CONFLICT);
    }
}
