package com.edualto;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;

@SpringBootApplication
public class EduAltoApplication {

    private static final Logger log = LoggerFactory.getLogger(EduAltoApplication.class);

    private final Environment environment;

    public EduAltoApplication(Environment environment) {
        this.environment = environment;
    }

    public static void main(String[] args) {
        loadDotenv();
        SpringApplication.run(EduAltoApplication.class, args);
    }

    private static void loadDotenv() {
        for (Path path : List.of(Path.of(".env"), Path.of("../.env"))) {
            if (Files.exists(path)) {
                try (var lines = Files.lines(path)) {
                    lines.map(String::trim)
                            .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                            .forEach(line -> {
                                int eqIdx = line.indexOf('=');
                                if (eqIdx > 0) {
                                    String key = line.substring(0, eqIdx).trim();
                                    String value = line.substring(eqIdx + 1).trim();
                                    if ((value.startsWith("\"") && value.endsWith("\""))
                                            || (value.startsWith("'") && value.endsWith("'"))) {
                                        value = value.substring(1, value.length() - 1);
                                    }
                                    if (System.getProperty(key) == null && System.getenv(key) == null) {
                                        System.setProperty(key, value);
                                    }
                                }
                            });
                    log.info("Đã nạp biến môi trường từ {}", path.toAbsolutePath().normalize());
                    break;
                } catch (Exception e) {
                    log.warn("Không thể nạp .env từ {}: {}", path, e.getMessage());
                }
            }
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        String port = environment.getProperty("server.port", "8080");
        String swaggerPath = environment.getProperty("springdoc.swagger-ui.path", "/swagger-ui.html");
        boolean mailEnabled = Boolean.parseBoolean(environment.getProperty("edualto.mail.enabled", "false"));
        String mailHost = environment.getProperty("spring.mail.host", "smtp.gmail.com");
        String mailUsername = environment.getProperty("spring.mail.username", "");

        String mailStatus = mailEnabled
                ? "BẬT (" + mailHost + " -> " + mailUsername + ") - Gửi email OTP thực tế"
                : "TẮT (Chế độ Development - Bỏ qua gửi email)";

        log.info("""
                
                ========================================================================================
                🎉  EDUALTO BACKEND SERVER ĐÃ KHỞI ĐỘNG THÀNH CÔNG!
                ----------------------------------------------------------------------------------------
                🌐  API Base URL : http://localhost:{}/api/v1
                📚  Swagger UI   : http://localhost:{}{}
                🗄️   Database     : PostgreSQL (Flyway Migrations V1, V2 Active)
                📧  Dịch vụ Mail : {}
                ✨  Trạng thái   : Sẵn sàng phục vụ yêu cầu từ Frontend!
                ========================================================================================
                """, port, port, swaggerPath, mailStatus);
    }
}
