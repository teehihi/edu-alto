package com.edualto.storage;

import com.edualto.storage.config.R2StorageProperties;
import com.edualto.storage.dto.PresignedUploadUrl;
import com.edualto.storage.infrastructure.R2StorageService;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.http.AbortableInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class R2StorageServiceTest {
    @Mock
    private S3Client s3Client;

    @Mock
    private S3Presigner presigner;

    @Test
    void videoUploadPresignKeepsObjectPrivateAndUncached() throws MalformedURLException {
        R2StorageService storage = new R2StorageService(s3Client, presigner,
                new R2StorageProperties(null, null, null, "edualto-media", "https://r2.test", null));
        PresignedPutObjectRequest signedRequest = mock(PresignedPutObjectRequest.class);
        Instant expiration = Instant.now().plusSeconds(900);
        when(signedRequest.url()).thenReturn(new URL("https://r2.test/upload"));
        when(signedRequest.expiration()).thenReturn(expiration);
        when(presigner.presignPutObject(any(PutObjectPresignRequest.class))).thenReturn(signedRequest);

        PresignedUploadUrl result = storage.generatePresignedUploadUrl("course-videos/private.mp4",
                "video/mp4", 4096L, Duration.ofMinutes(15), "private, no-store");

        ArgumentCaptor<PutObjectPresignRequest> request = ArgumentCaptor.forClass(PutObjectPresignRequest.class);
        verify(presigner).presignPutObject(request.capture());
        PutObjectRequest object = request.getValue().putObjectRequest();
        assertThat(object.cacheControl()).isEqualTo("private, no-store");
        assertThat(object.contentType()).isEqualTo("video/mp4");
        assertThat(result.objectKey()).isEqualTo("course-videos/private.mp4");
    }

    @Test
    void openObjectStreamStreamsDirectlyFromS3Client() throws IOException {
        R2StorageService storage = new R2StorageService(s3Client, presigner,
                new R2StorageProperties(null, null, null, "edualto-media", "https://r2.test", null));
        byte[] payload = "streamed-bytes".getBytes(StandardCharsets.UTF_8);
        ResponseInputStream<GetObjectResponse> responseStream = new ResponseInputStream<>(
                GetObjectResponse.builder().contentLength((long) payload.length).build(),
                AbortableInputStream.create(new ByteArrayInputStream(payload))
        );
        when(s3Client.getObject(any(GetObjectRequest.class))).thenReturn(responseStream);

        try (InputStream stream = storage.openObjectStream("avatars/user-1/pic.webp")) {
            assertThat(stream.readAllBytes()).isEqualTo(payload);
        }

        ArgumentCaptor<GetObjectRequest> requestCaptor = ArgumentCaptor.forClass(GetObjectRequest.class);
        verify(s3Client).getObject(requestCaptor.capture());
        assertThat(requestCaptor.getValue().bucket()).isEqualTo("edualto-media");
        assertThat(requestCaptor.getValue().key()).isEqualTo("avatars/user-1/pic.webp");
    }
}
