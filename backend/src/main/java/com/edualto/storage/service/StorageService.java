package com.edualto.storage.service;

import com.edualto.storage.dto.ObjectMetadata;
import com.edualto.storage.dto.PresignedUploadUrl;
import com.edualto.storage.dto.PresignedDownloadUrl;
import java.time.Duration;

public interface StorageService {

    PresignedUploadUrl generatePresignedUploadUrl(String objectKey, String contentType, long contentLength, Duration expiration);

    PresignedUploadUrl generatePresignedUploadUrl(
            String objectKey, String contentType, long contentLength, Duration expiration, String cacheControl);

    PresignedDownloadUrl generatePresignedDownloadUrl(String objectKey, Duration expiration);

    void putObject(String objectKey, String contentType, byte[] data);

    byte[] getObjectBytes(String objectKey);

    boolean objectExists(String objectKey);

    ObjectMetadata getObjectMetadata(String objectKey);

    void deleteObject(String objectKey);

    String getPublicUrl(String objectKey);
}
