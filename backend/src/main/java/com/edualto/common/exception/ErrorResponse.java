package com.edualto.common.exception;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(
        boolean success,
        ErrorBody error,
        Instant timestamp,
        String path
) {
    public static ErrorResponse of(String code, String message, List<ErrorDetail> details, String path) {
        return new ErrorResponse(false, new ErrorBody(code, message, details), Instant.now(), path);
    }
}
