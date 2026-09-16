# Coding Standards

## Language

User-facing text is Vietnamese. Source code, database names and API paths are English.

## Frontend

- Use TypeScript strict mode.
- Prefer server components by default; use client components only for interactive state.
- Keep shared UI in `src/components/ui`.
- Keep layout components in `src/components/layout`.
- Keep feature composition in `src/features`.
- Avoid large components; split when a file becomes difficult to scan.
- Use semantic HTML and accessible labels.
- Do not show raw technical errors to end users.
- Use stable design tokens from Tailwind config and CSS variables.

## Backend

- Controller delegates to service.
- Service owns use-case orchestration.
- Domain owns core state and rules.
- Repository owns persistence.
- DTOs are separate from entities.
- Validate input with Jakarta Validation.
- Use `@ControllerAdvice` for consistent errors.
- Keep secrets in environment variables.

## Naming

- React component: `CourseCard`.
- Hooks: `useCourseFilters`.
- Java service: `CourseService`.
- Java repository: `CourseRepository`.
- DTO: `CourseResponse`, `CreateCourseRequest`.
- Database: `learning_progress`, `course_id`.
- API: `/api/v1/courses/{id}`.

## Error handling

Frontend:

- Error title/message in Vietnamese.
- Retry action for recoverable errors.
- Empty state for no data.

Backend:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": []
  },
  "timestamp": "2026-09-16T00:00:00Z",
  "path": "/api/v1/courses"
}
```

## Testing

- Test behavior, not implementation details.
- Use focused tests for foundation; expand coverage per feature phase.
- Backend tests should cover validation and service rules before repository integration.

## Security

- Never commit real secrets.
- Never store plaintext passwords.
- Never expose stack traces in API responses.
- Rate limiting and upload scanning must be revisited before production.
