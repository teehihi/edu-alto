package com.edualto.analytics.service;

import com.edualto.analytics.dto.AdminMlRetrainResponse;
import com.edualto.analytics.dto.AdminMlStatusResponse;
import com.edualto.common.exception.BusinessException;
import com.edualto.user.service.UserService;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class MlModelManagementService implements DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(MlModelManagementService.class);

    private final UserService userService;
    private final ObjectMapper objectMapper;
    private final Path rootPath;
    private final Path scriptPath;
    private final Path metadataPath;
    private final boolean scheduledRetrainEnabled;

    private final AtomicBoolean isRunning = new AtomicBoolean(false);
    private final AtomicReference<String> lastRunStatus = new AtomicReference<>("IDLE");
    private final AtomicReference<Instant> lastRunStartedAt = new AtomicReference<>(null);
    private final AtomicReference<Instant> lastRunFinishedAt = new AtomicReference<>(null);
    private final AtomicReference<String> lastRunMessage = new AtomicReference<>("Hệ thống mô hình học máy đang hoạt động bình thường.");

    private final ExecutorService executorService = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "ml-retrain-worker");
        thread.setDaemon(true);
        return thread;
    });

    public MlModelManagementService(
            UserService userService,
            ObjectMapper objectMapper,
            @Value("${edualto.ml.project-root:}") String configuredRoot,
            @Value("${edualto.ml.scheduled-retrain.enabled:true}") boolean scheduledRetrainEnabled
    ) {
        this.userService = userService;
        this.objectMapper = objectMapper;
        this.scheduledRetrainEnabled = scheduledRetrainEnabled;

        Path resolvedRoot = configuredRoot != null && !configuredRoot.isBlank()
                ? Path.of(configuredRoot)
                : resolveProjectRoot();
        this.rootPath = resolvedRoot;
        this.scriptPath = resolvedRoot.resolve("scripts/ml_pipeline/auto_retrain.sh");
        this.metadataPath = resolvedRoot.resolve("models/model_metadata.json");
    }

    private static Path resolveProjectRoot() {
        Path current = Path.of("").toAbsolutePath();
        if (Files.exists(current.resolve("scripts/ml_pipeline/auto_retrain.sh"))) {
            return current;
        }
        if (current.endsWith("backend") && Files.exists(current.getParent().resolve("scripts/ml_pipeline/auto_retrain.sh"))) {
            return current.getParent();
        }
        return current;
    }

    public AdminMlRetrainResponse triggerManualRetrain(UUID adminId) {
        if (adminId != null) {
            userService.requireActiveAdmin(adminId);
        }
        return triggerRetrainInternal("MANUAL_ADMIN");
    }

    @Scheduled(cron = "${edualto.ml.retrain.cron:0 0 2 * * SUN}")
    public void scheduledWeeklyRetrain() {
        if (!scheduledRetrainEnabled) {
            log.info("Lập lịch huấn luyện lại mô hình bị vô hiệu hóa bởi cấu hình edualto.ml.scheduled-retrain.enabled=false");
            return;
        }
        log.info("Bắt đầu kích hoạt tiến trình huấn luyện lại mô hình học máy theo lịch định kỳ hàng tuần (2:00 AM Chủ Nhật)...");
        triggerRetrainInternal("SCHEDULED_CRON");
    }

    private AdminMlRetrainResponse triggerRetrainInternal(String triggeredBy) {
        if (!isRunning.compareAndSet(false, true)) {
            throw new BusinessException(HttpStatus.CONFLICT, "ML_RETRAIN_IN_PROGRESS", "Tiến trình huấn luyện mô hình đang chạy. Vui lòng thử lại sau.");
        }

        Instant startedAt = Instant.now();
        lastRunStartedAt.set(startedAt);
        lastRunStatus.set("RUNNING");
        lastRunMessage.set("Tiến trình huấn luyện lại mô hình đang được thực thi ngầm bởi " + triggeredBy + "...");

        executorService.submit(() -> executeRetrainProcess(triggeredBy));

        return new AdminMlRetrainResponse("RUNNING", "Đã khởi chạy tiến trình huấn luyện lại mô hình ngầm.", startedAt);
    }

    private void executeRetrainProcess(String triggeredBy) {
        try {
            log.info("Khởi chạy script auto_retrain.sh từ thư mục root: {} (Kích hoạt bởi: {})", rootPath, triggeredBy);
            File scriptFile = scriptPath.toFile();
            if (!scriptFile.exists()) {
                throw new IllegalStateException("Không tìm thấy file script huấn luyện tại: " + scriptPath);
            }

            ProcessBuilder pb = new ProcessBuilder("/bin/bash", scriptPath.toString());
            pb.directory(rootPath.toFile());
            pb.redirectErrorStream(true);

            Process process = pb.start();
            int exitCode = process.waitFor();
            Instant finishedAt = Instant.now();
            lastRunFinishedAt.set(finishedAt);

            if (exitCode == 0) {
                lastRunStatus.set("SUCCESS");
                lastRunMessage.set("Huấn luyện mô hình học máy thành công lúc " + finishedAt + " (" + triggeredBy + ").");
                log.info("Huấn luyện lại mô hình học máy hoàn tất thành công (exit code 0).");
            } else {
                lastRunStatus.set("FAILED");
                lastRunMessage.set("Huấn luyện thất bại với mã lỗi exit code " + exitCode + ".");
                log.error("Huấn luyện lại mô hình học máy thất bại với exit code {}", exitCode);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            lastRunStatus.set("FAILED");
            lastRunMessage.set("Tiến trình huấn luyện bị gián đoạn: " + e.getMessage());
            log.warn("Tiến trình huấn luyện bị ngắt quãng", e);
        } catch (Exception e) {
            lastRunStatus.set("FAILED");
            lastRunMessage.set("Lỗi khi thực thi script huấn luyện: " + e.getMessage());
            log.error("Lỗi khi huấn luyện lại mô hình ML", e);
        } finally {
            isRunning.set(false);
        }
    }

    public AdminMlStatusResponse getStatus(UUID adminId) {
        if (adminId != null) {
            userService.requireActiveAdmin(adminId);
        }

        String championModel = "LightGBM";
        Double rocAuc = null;
        Double f1Score = null;
        Double accuracy = null;
        Integer trainSamples = null;
        Integer testSamples = null;
        List<String> topFeatures = new ArrayList<>();

        if (Files.exists(metadataPath)) {
            try {
                JsonNode root = objectMapper.readTree(metadataPath.toFile());
                if (root.has("champion_model")) {
                    championModel = root.get("champion_model").asText();
                }
                if (root.has("train_samples")) {
                    trainSamples = root.get("train_samples").asInt();
                }
                if (root.has("test_samples")) {
                    testSamples = root.get("test_samples").asInt();
                }

                if (root.has("benchmark_comparison") && root.get("benchmark_comparison").isArray()) {
                    for (JsonNode modelNode : root.get("benchmark_comparison")) {
                        String name = modelNode.path("model_name").asText();
                        if (name.contains("LightGBM") || name.contains("Champion")) {
                            rocAuc = modelNode.path("roc_auc").asDouble();
                            f1Score = modelNode.path("f1_score").asDouble();
                            accuracy = modelNode.path("accuracy").asDouble();
                            break;
                        }
                    }
                }

                if (root.has("top_features_by_gain") && root.get("top_features_by_gain").isArray()) {
                    for (JsonNode featNode : root.get("top_features_by_gain")) {
                        topFeatures.add(featNode.path("feature").asText());
                        if (topFeatures.size() >= 5) {
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Không thể đọc metadata mô hình từ file {}: {}", metadataPath, e.getMessage());
            }
        }

        return new AdminMlStatusResponse(
                lastRunStatus.get(),
                championModel,
                rocAuc,
                f1Score,
                accuracy,
                trainSamples,
                testSamples,
                lastRunStartedAt.get(),
                lastRunFinishedAt.get(),
                lastRunMessage.get(),
                isRunning.get(),
                topFeatures
        );
    }

    @Override
    public void destroy() {
        executorService.shutdown();
    }
}
