package com.edualto.ai.infrastructure;

import com.edualto.ai.config.AiProperties;
import com.edualto.common.exception.BusinessException;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Semaphore;
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class GeminiClient {
    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);
    private static final int MAX_RESPONSE_BYTES = 1_000_000;
    private final AiProperties properties;
    private final ObjectMapper mapper;
    private final HttpClient http;
    private final Semaphore concurrent = new Semaphore(1);
    private final ArrayDeque<Instant> requests = new ArrayDeque<>();
    private LocalDate budgetDate = LocalDate.now(ZoneOffset.UTC);
    private int dailyRequests;

    public GeminiClient(AiProperties properties, ObjectMapper mapper) {
        this.properties = properties;
        this.mapper = mapper;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER).build();
    }

    public boolean isAvailable() {
        return properties.enabled() && !properties.apiKey().isBlank();
    }

    public Generation generate(String systemInstruction, String prompt, String jsonSchema) {
        return generate(systemInstruction, prompt, jsonSchema, 16000);
    }

    public Generation generate(String systemInstruction, String prompt, String jsonSchema, int maxOutputTokens) {
        if (!isAvailable()) {
            throw failure(HttpStatus.SERVICE_UNAVAILABLE, "AI_NOT_CONFIGURED",
                    "Trợ lý AI chưa được bật. Vui lòng liên hệ quản trị viên để cấu hình Gemini.");
        }
        if (!concurrent.tryAcquire()) {
            throw failure(HttpStatus.TOO_MANY_REQUESTS, "AI_BUSY",
                    "Trợ lý đang xử lý một yêu cầu khác. Vui lòng thử lại sau một lát.");
        }
        try {
            claimBudget();
            String requestMode = jsonSchema == null ? "json" : "structured";
            HttpResponse<byte[]> response = null;
            String responseModel = properties.model();
            List<String> modelChain = properties.modelFallbackChain();
            for (int modelIndex = 0; modelIndex < modelChain.size(); modelIndex++) {
                String model = modelChain.get(modelIndex);
                responseModel = model;
                response = sendWithRetries(
                        buildRequest(model, systemInstruction, prompt, jsonSchema, maxOutputTokens), model);
                if (response.statusCode() == 400 && jsonSchema != null) {
                    log.warn("Gemini rejected structured output: model={}, providerError={}; retrying in JSON mode",
                            model, providerErrorSummary(response.body()));
                    String fallbackInstruction = systemInstruction + "\n\nReturn JSON matching this schema:\n" + jsonSchema;
                    response = sendWithRetries(
                            buildRequest(model, fallbackInstruction, prompt, null, maxOutputTokens), model);
                    requestMode = "json-fallback";
                }
                if (response.statusCode() != 429) break;
                log.warn("Gemini model quota reached; trying fallback: model={}, nextModelAvailable={}",
                        model, modelIndex < modelChain.size() - 1);
            }
            if (response == null) throw new IllegalStateException("Gemini model chain is empty");
            byte[] bytes = response.body();
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Gemini request failed: model={}, mode={}, httpStatus={}, providerError={}",
                        responseModel, requestMode, response.statusCode(), providerErrorSummary(bytes));
            }
            if (response.statusCode() == 429) {
                throw failure(HttpStatus.TOO_MANY_REQUESTS, "AI_PROVIDER_RATE_LIMIT",
                        "Các model Gemini đã cấu hình đều hết hạn mức tạm thời. Vui lòng thử lại sau hoặc kiểm tra quota API.");
            }
            if (response.statusCode() == 400) {
                throw failure(HttpStatus.BAD_GATEWAY, "AI_PROVIDER_REQUEST_INVALID",
                        "Gemini từ chối định dạng yêu cầu. Vui lòng kiểm tra model và cấu hình JSON trong log backend.");
            }
            if (response.statusCode() == 401 || response.statusCode() == 403 || response.statusCode() == 404) {
                throw failure(HttpStatus.SERVICE_UNAVAILABLE, "AI_PROVIDER_CONFIGURATION",
                        "Gemini chưa truy cập được model đã cấu hình. Vui lòng kiểm tra API key và tên model trong AI Studio.");
            }
            if (response.statusCode() == 503) {
                throw failure(HttpStatus.BAD_GATEWAY, "AI_PROVIDER_UNAVAILABLE",
                        "Gemini đang quá tải tạm thời. Hệ thống đã thử lại nhưng chưa thành công; vui lòng thử lại sau.");
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300 || bytes.length > MAX_RESPONSE_BYTES) {
                throw failure(HttpStatus.BAD_GATEWAY, "AI_PROVIDER_UNAVAILABLE",
                        "Gemini chưa phản hồi được. Vui lòng thử lại sau.");
            }
            JsonNode candidate = mapper.readTree(bytes).path("candidates").path(0);
            if (!"STOP".equals(candidate.path("finishReason").asString())) {
                throw failure(HttpStatus.BAD_GATEWAY, "AI_RESPONSE_INCOMPLETE",
                        "AI chưa tạo được kết quả đầy đủ. Vui lòng chia nhỏ tài liệu hoặc đổi câu hỏi.");
            }
            StringBuilder result = new StringBuilder();
            for (JsonNode part : candidate.path("content").path("parts")) {
                if (!part.path("thought").asBoolean(false)) {
                    result.append(part.path("text").asString(""));
                }
            }
            if (result.isEmpty()) {
                throw failure(HttpStatus.BAD_GATEWAY, "AI_EMPTY_RESPONSE", "AI chưa tạo được nội dung. Vui lòng thử lại.");
            }
            return new Generation(result.toString(), responseModel);
        } catch (BusinessException exception) {
            throw exception;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw failure(HttpStatus.SERVICE_UNAVAILABLE, "AI_REQUEST_INTERRUPTED", "Yêu cầu AI đã bị gián đoạn. Vui lòng thử lại.");
        } catch (IOException exception) {
            throw failure(HttpStatus.GATEWAY_TIMEOUT, "AI_NETWORK_ERROR", "Kết nối Gemini bị gián đoạn hoặc quá thời gian chờ. Vui lòng thử lại.");
        } catch (RuntimeException exception) {
            throw failure(HttpStatus.BAD_GATEWAY, "AI_INVALID_RESPONSE", "AI trả về dữ liệu chưa hợp lệ. Vui lòng thử lại.");
        } finally {
            concurrent.release();
        }
    }

    private HttpRequest buildRequest(String model, String systemInstruction, String prompt, String jsonSchema, int maxOutputTokens)
            throws IOException {
        Map<String, Object> generation = jsonSchema == null
                ? Map.of("maxOutputTokens", maxOutputTokens, "responseMimeType", "application/json",
                        "thinkingConfig", Map.of("thinkingLevel", "low"))
                : Map.of("maxOutputTokens", maxOutputTokens,
                        "thinkingConfig", Map.of("thinkingLevel", "low"),
                        "responseFormat", Map.of("text", Map.of("mimeType", "APPLICATION_JSON",
                                "schema", mapper.readTree(jsonSchema))));
        String body = mapper.writeValueAsString(Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))),
                "generationConfig", generation));
        return HttpRequest.newBuilder(URI.create(
                        "https://generativelanguage.googleapis.com/v1beta/models/"
                                + model + ":generateContent"))
                .timeout(Duration.ofSeconds(properties.requestTimeoutSeconds()))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", properties.apiKey())
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8)).build();
    }

    private HttpResponse<byte[]> sendWithRetries(HttpRequest request, String model) throws IOException, InterruptedException {
        int maxAttempts = 3;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 503 || attempt == maxAttempts) return response;

            long backoffMillis = (1_000L << (attempt - 1)) + ThreadLocalRandom.current().nextLong(250);
            log.warn("Gemini returned 503; retrying: model={}, nextAttempt={}/{}, delayMs={}",
                    model, attempt + 1, maxAttempts, backoffMillis);
            Thread.sleep(backoffMillis);
        }
        throw new IllegalStateException("Gemini retry loop ended unexpectedly");
    }

    private synchronized void claimBudget() {
        Instant now = Instant.now();
        while (!requests.isEmpty() && requests.peekFirst().isBefore(now.minusSeconds(60))) {
            requests.removeFirst();
        }
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        if (!today.equals(budgetDate)) {
            budgetDate = today;
            dailyRequests = 0;
        }
        if (requests.size() >= properties.requestsPerMinute() || dailyRequests >= properties.dailyRequestLimit()) {
            throw failure(HttpStatus.TOO_MANY_REQUESTS, "AI_BUDGET_EXCEEDED",
                    "Trợ lý đã đạt giới hạn sử dụng của bản thử nghiệm. Vui lòng thử lại sau hoặc liên hệ quản trị viên.");
        }
        requests.addLast(now);
        dailyRequests++;
    }

    private String providerErrorSummary(byte[] responseBody) {
        if (responseBody.length == 0) return "empty response";
        try {
            JsonNode error = mapper.readTree(responseBody).path("error");
            String code = error.path("code").asString("");
            String status = error.path("status").asString("");
            String message = error.path("message").asString("");
            JsonNode details = error.path("details");
            String detailText = details.isArray() && !details.isEmpty() ? details.toString() : "";
            String summary = status.isBlank() ? message : status + (message.isBlank() ? "" : ": " + message);
            if (!code.isBlank()) summary = "code=" + code + (summary.isBlank() ? "" : ", " + summary);
            if (!detailText.isBlank()) summary += ", details=" + detailText;
            if (summary.isBlank()) return "provider returned no error details";
            String apiKey = properties.apiKey();
            if (!apiKey.isBlank()) summary = summary.replace(apiKey, "[REDACTED]");
            summary = summary.replaceAll("[\\r\\n\\t]+", " ").replaceAll("\\s{2,}", " ").trim();
            return summary.substring(0, Math.min(summary.length(), 500));
        } catch (RuntimeException exception) {
            return "unparseable response (" + responseBody.length + " bytes)";
        }
    }

    private static BusinessException failure(HttpStatus status, String code, String message) {
        return new BusinessException(status, code, message);
    }

    public record Generation(String text, String model) {}
}
