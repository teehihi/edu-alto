package com.edualto.common.exception;

import java.util.List;

public record ErrorBody(String code, String message, List<ErrorDetail> details) {
}
