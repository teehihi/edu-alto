package com.edualto.storage.dto;

public record ObjectMetadata(
        String contentType,
        long contentLength,
        String eTag
) {
}
