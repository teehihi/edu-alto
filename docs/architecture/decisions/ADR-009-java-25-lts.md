# ADR-009: Java 25 LTS

## Status

Accepted

## Context

EduAlto backend ban đầu dùng Java 17. Dự án cần chuyển backend sang Java 25 LTS trong khi vẫn giữ modular monolith, Spring Boot stack hiện tại và không thay đổi hành vi ứng dụng.

## Decision

Backend dùng Java 25 LTS cho local development, CI, Maven build và Docker runtime.

Spring Boot được nâng từ `3.3.6` lên nhánh minor `3.5.16` để có hỗ trợ Java 25 chính thức. Không nâng lên Spring Boot 4 vì đây là maintenance migration nhỏ và không cần major framework migration cho phạm vi hiện tại.

Dockerfile backend được chuyển vào `backend/Dockerfile` và dùng image Java 25. Dockerfile frontend được chuyển vào `frontend/Dockerfile`. Docker Compose vẫn giữ build context ở repository root để hành vi `COPY` và workspace build không đổi.

## Compatibility Considerations

- Maven compiler target dùng property `java.version=25`.
- Spring Boot major version không đổi; dependency tree chỉ đổi ở mức cần thiết cho Java 25 support.
- Source code, package structure, API, database, Redis, WebSocket và frontend behavior không đổi.

## Validation

Validation cần bao gồm:

- `java -version`
- `mvn -version`
- `mvn -f backend/pom.xml test`
- `mvn -f backend/pom.xml package`
- frontend typecheck, lint, test và build
- `docker compose config`
- Docker image build cho backend và frontend

## Consequences

- Backend foundation chạy trên Java 25 LTS.
- CI cần dùng Temurin Java 25.
- Runtime Docker image chuyển sang Java 25.
- Nếu cần rollback, có thể đưa `java.version`, CI Java version và backend Docker base image về Java 17, đồng thời hạ Spring Boot về phiên bản trước đó sau khi chạy lại test/package.
