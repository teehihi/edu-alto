package com.edualto.storage.infrastructure;

import com.edualto.storage.config.R2StorageProperties;
import com.edualto.storage.dto.ObjectMetadata;
import com.edualto.storage.dto.PresignedDownloadUrl;
import com.edualto.storage.dto.PresignedUploadUrl;
import com.edualto.storage.service.StorageService;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class R2StorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(R2StorageService.class);

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final R2StorageProperties properties;

    public R2StorageService(S3Client s3Client, S3Presigner s3Presigner, R2StorageProperties properties) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.properties = properties;
    }

    @PostConstruct
    public void logConfiguration() {
        boolean publicUrlConfigured = properties.publicUrlPrefix() != null && !properties.publicUrlPrefix().isBlank();
        boolean credentialsConfigured = properties.accessKeyId() != null
                && !properties.accessKeyId().isBlank()
                && properties.secretAccessKey() != null
                && !properties.secretAccessKey().isBlank();
        log.info(
                "Cloudflare R2 configured: bucket={}, endpoint={}, credentialsConfigured={}, publicUrlConfigured={}; bucket CORS must be provisioned separately",
                properties.bucketName(),
                properties.endpoint(),
                credentialsConfigured,
                publicUrlConfigured
        );
    }

    @Override
    public PresignedUploadUrl generatePresignedUploadUrl(String objectKey, String contentType, long contentLength, Duration expiration) {
        return generatePresignedUploadUrl(objectKey, contentType, contentLength, expiration,
                "public, max-age=31536000, immutable");
    }

    @Override
    public PresignedUploadUrl generatePresignedUploadUrl(
            String objectKey, String contentType, long contentLength, Duration expiration, String cacheControl) {
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(properties.bucketName())
                .key(objectKey)
                .contentType(contentType)
                .contentLength(contentLength)
                .cacheControl(cacheControl)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(expiration)
                .putObjectRequest(objectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
        return new PresignedUploadUrl(
                presignedRequest.url().toString(),
                objectKey,
                presignedRequest.expiration()
        );
    }

    @Override
    public PresignedDownloadUrl generatePresignedDownloadUrl(String objectKey, Duration expiration) {
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(properties.bucketName())
                .key(objectKey)
                .build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(expiration)
                .getObjectRequest(getRequest)
                .build();
        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        return new PresignedDownloadUrl(presignedRequest.url().toString(), presignedRequest.expiration());
    }

    @Override
    public void putObject(String objectKey, String contentType, byte[] data) {
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(properties.bucketName())
                .key(objectKey)
                .contentType(contentType)
                .contentLength((long) data.length)
                .cacheControl("public, max-age=31536000, immutable")
                .build();
        s3Client.putObject(putRequest, RequestBody.fromBytes(data));
    }

    @Override
    public void putObject(String objectKey, String contentType, InputStream data, long contentLength) {
        PutObjectRequest putRequest = PutObjectRequest.builder()
                .bucket(properties.bucketName())
                .key(objectKey)
                .contentType(contentType)
                .contentLength(contentLength)
                .cacheControl("private, no-store")
                .build();
        s3Client.putObject(putRequest, RequestBody.fromInputStream(data, contentLength));
    }

    @Override
    public byte[] getObjectBytes(String objectKey) {
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(properties.bucketName())
                .key(objectKey)
                .build();
        return s3Client.getObjectAsBytes(getRequest).asByteArray();
    }

    @Override
    public boolean objectExists(String objectKey) {
        try {
            HeadObjectRequest headRequest = HeadObjectRequest.builder()
                    .bucket(properties.bucketName())
                    .key(objectKey)
                    .build();
            s3Client.headObject(headRequest);
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (Exception e) {
            log.warn("Lỗi kiểm tra object tồn tại trên R2 với key: {}", objectKey, e);
            return false;
        }
    }

    @Override
    public ObjectMetadata getObjectMetadata(String objectKey) {
        try {
            HeadObjectRequest headRequest = HeadObjectRequest.builder()
                    .bucket(properties.bucketName())
                    .key(objectKey)
                    .build();
            HeadObjectResponse response = s3Client.headObject(headRequest);
            return new ObjectMetadata(
                    response.contentType(),
                    response.contentLength() != null ? response.contentLength() : 0L,
                    response.eTag()
            );
        } catch (NoSuchKeyException e) {
            return null;
        } catch (Exception e) {
            log.warn("Lỗi lấy metadata object từ R2 với key: {}", objectKey, e);
            return null;
        }
    }

    @Override
    public void deleteObject(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }
        try {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(properties.bucketName())
                    .key(objectKey)
                    .build();
            s3Client.deleteObject(deleteRequest);
        } catch (Exception e) {
            log.warn("Lỗi xoá object trên R2 với key: {}", objectKey, e);
        }
    }

    @Override
    public String getPublicUrl(String objectKey) {
        if (objectKey == null || objectKey.isBlank()) {
            return null;
        }
        if (properties.publicUrlPrefix() != null && !properties.publicUrlPrefix().isBlank()) {
            String prefix = properties.publicUrlPrefix().replaceAll("/+$", "");
            return prefix + "/" + objectKey.replaceAll("^/+", "");
        }
        return "/api/v1/media/" + objectKey.replaceAll("^/+", "");
    }
}
