package com.edualto.storage.controller;

import com.edualto.storage.dto.ObjectMetadata;
import com.edualto.storage.service.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.HandlerMapping;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/media")
@Tag(name = "Media", description = "Endpoints phục vụ file media công khai từ storage")
public class MediaController {

    private final StorageService storageService;

    public MediaController(StorageService storageService) {
        this.storageService = storageService;
    }

    @GetMapping("/**")
    @Operation(summary = "Lấy dữ liệu tệp media công khai (ảnh đại diện, thumbnail, tài liệu)")
    public ResponseEntity<byte[]> getMedia(HttpServletRequest request) {
        String path = (String) request.getAttribute(HandlerMapping.PATH_WITHIN_HANDLER_MAPPING_ATTRIBUTE);
        if (path == null) {
            return ResponseEntity.notFound().build();
        }

        // Bỏ tiền tố /api/v1/media/
        String objectKey = path.replaceFirst("^/api/v1/media/?", "");
        if (objectKey.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            if (!storageService.objectExists(objectKey)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            byte[] data = storageService.getObjectBytes(objectKey);
            ObjectMetadata metadata = storageService.getObjectMetadata(objectKey);

            String contentType = (metadata != null && metadata.contentType() != null && !metadata.contentType().isBlank())
                    ? metadata.contentType()
                    : MediaType.APPLICATION_OCTET_STREAM_VALUE;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.setContentLength(data.length);
            headers.setCacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic().staleWhileRevalidate(Duration.ofDays(30)));
            if (metadata != null && metadata.eTag() != null) {
                headers.setETag(metadata.eTag());
            }

            return new ResponseEntity<>(data, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
