package com.edualto.commerce.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties({
        VnPayProperties.class,
        MoMoProperties.class,
        SepayProperties.class,
        StripeProperties.class
})
public class CommerceConfiguration {

    @Bean
    public RestClient paymentRestClient() {
        return RestClient.builder().build();
    }
}
