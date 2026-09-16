# ADR-003: PostgreSQL as Primary Store

## Status

Accepted

## Context

EduAlto cần lưu user, course, enrollment, learning progress, assessment, messaging, notification và AI metadata có quan hệ rõ ràng. Dữ liệu cần constraint, transaction và query linh hoạt.

## Decision

PostgreSQL là primary data store. Table/column dùng English snake_case. Primary key mặc định UUID. Entity quan trọng có `created_at`, `updated_at`. Enum lưu string ổn định, không lưu ordinal.

## Consequences

- Có FK, unique constraint và index rõ ràng.
- Transaction cho enrollment/progress/assessment đơn giản.
- Cần migration tool như Flyway hoặc Liquibase trong phase triển khai schema.

