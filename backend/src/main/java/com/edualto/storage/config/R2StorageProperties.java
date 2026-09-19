package com.edualto.storage.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "edualto.storage.r2")
public record R2StorageProperties(
        String accountId,
        String accessKeyId,
        String secretAccessKey,
        String bucketName,
        String endpoint,
        String publicUrlPrefix
) {
    public R2StorageProperties {
        if (bucketName == null || bucketName.isBlank()) {
            bucketName = "edualto-media";
        }
        if (endpoint == null || endpoint.isBlank()) {
            endpoint = "https://3ed9aadd55d96eecea0f7857c5c1cf2e.r2.cloudflarestorage.com";
        }
    }
}
