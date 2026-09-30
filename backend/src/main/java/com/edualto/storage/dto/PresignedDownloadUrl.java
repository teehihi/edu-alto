package com.edualto.storage.dto;

import java.time.Instant;

public record PresignedDownloadUrl(String downloadUrl, Instant expiresAt) {
}
