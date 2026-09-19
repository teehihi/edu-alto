package com.edualto.storage.config;

import java.net.URI;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

@Configuration
@EnableConfigurationProperties(R2StorageProperties.class)
public class R2StorageConfig {

    @Bean
    public S3Client s3Client(R2StorageProperties properties) {
        String accessKey = properties.accessKeyId() != null && !properties.accessKeyId().isBlank()
                ? properties.accessKeyId()
                : "dummy-access-key";
        String secretKey = properties.secretAccessKey() != null && !properties.secretAccessKey().isBlank()
                ? properties.secretAccessKey()
                : "dummy-secret-key";

        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);

        return S3Client.builder()
                .endpointOverride(URI.create(properties.endpoint()))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.of("auto"))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }

    @Bean
    public S3Presigner s3Presigner(R2StorageProperties properties) {
        String accessKey = properties.accessKeyId() != null && !properties.accessKeyId().isBlank()
                ? properties.accessKeyId()
                : "dummy-access-key";
        String secretKey = properties.secretAccessKey() != null && !properties.secretAccessKey().isBlank()
                ? properties.secretAccessKey()
                : "dummy-secret-key";

        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);

        return S3Presigner.builder()
                .endpointOverride(URI.create(properties.endpoint()))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.of("auto"))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }
}
