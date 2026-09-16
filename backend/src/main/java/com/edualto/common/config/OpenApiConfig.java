package com.edualto.common.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI eduAltoOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("EduAlto API")
                        .version("v1")
                        .description("REST API cho nền tảng học tập trực tuyến EduAlto"));
    }
}
