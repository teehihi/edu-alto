package com.edualto.storage.service;

import com.edualto.storage.dto.ObjectMetadata;
import com.edualto.storage.dto.PresignedUploadUrl;
import java.time.Duration;

public interface StorageService {

    PresignedUploadUrl generatePresignedUploadUrl(String objectKey, String contentType, long contentLength, Duration expiration);

    void putObject(String objectKey, String contentType, byte[] data);

    byte[] getObjectBytes(String objectKey);

    boolean objectExists(String objectKey);

    ObjectMetadata getObjectMetadata(String objectKey);

    void deleteObject(String objectKey);

    String getPublicUrl(String objectKey);
}

