# Gemini AI setup

## Required local environment

Add these entries to the existing root `.env`:

```dotenv
AI_ENABLED=true
GEMINI_API_KEY=your-ai-studio-api-key
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODELS=gemini-3.1-flash-lite
```

Create the key in [Google AI Studio](https://aistudio.google.com/api-keys). Use a Gemini API project; a Gemini Apps Google AI Plus/Pro Student subscription does not automatically change API billing/quota. Select stable models available to that project's tier and set their exact IDs. When the primary model returns HTTP 429, the backend tries the configured fallback models in order. Set `GEMINI_FALLBACK_MODELS=none` to disable fallback or provide a comma-separated list. Quotas remain project-specific and model-specific, so failover only helps while a fallback model has capacity. The key is never required in Vercel or any `NEXT_PUBLIC_*` variable.

## GitHub Actions / Lightsail

Create repository Actions **secret `GEMINI_API_KEY`** with the API key as its value. The existing workflow combines it with `LIGHTSAIL_ENV_FILE`, writes `AI_ENABLED=true`, `GEMINI_API_KEY`, `GEMINI_MODEL` and `GEMINI_FALLBACK_MODELS` into the protected Lightsail env file, and recreates the backend through Compose. Optional repository Actions variables `GEMINI_MODEL` and `GEMINI_FALLBACK_MODELS` override the primary and fallback models; defaults are `gemini-3.8-flash` and `gemini-3.1-flash-lite`. Never enter an API key in a GitHub variable or commit it.

`LIGHTSAIL_ENV_FILE` remains the required existing secret for DB/JWT/CORS configuration. Other AI limit variables can be appended there. If `GEMINI_API_KEY` is not configured separately, the workflow preserves its original env file, allowing an administrator to include the three entries there instead. `AI_ENABLED=false` disables provider calls; to disable an integration enabled by the separate key secret, remove that secret or use an empty secret value.

## Optional backend limits

| Environment variable | Default | Meaning |
| --- | --- | --- |
| `GEMINI_FALLBACK_MODELS` | `gemini-3.1-flash-lite` | Comma-separated fallback model IDs, tried in order only after HTTP 429 |
| `AI_REQUEST_TIMEOUT_SECONDS` | `90` | Gemini request deadline |
| `AI_REQUESTS_PER_MINUTE` | `6` | Shared application request budget per backend process; allows the primary model's 5-RPM quota response to trigger fallback |
| `AI_DAILY_REQUEST_LIMIT` | `40` | Shared provider budget per UTC day per process |
| `AI_MAX_CONTEXT_CHARS` | `18000` | Retrieved chatbot source text cap |
| `AI_MAX_IMPORT_CHARS` | `40000` | Extracted import source text cap |
| `AI_MAX_IMPORT_PAGES` | `60` | PDF page cap |

One Gemini request runs at a time. Budgets are conservative application limits, not Google's account-specific quota; inspect actual quota in AI Studio. Counters reset on backend restart and do not synchronize multiple replicas. A 429 tries configured fallback models in order; a 503 is retried up to three times on the same model. Each provider attempt may consume quota. The public chat endpoint also limits each visitor IP/user to eight requests per minute. A reverse proxy must use trusted real-IP configuration if distinct client IP throttling is required.

## Import behavior and limits

The instructor's curriculum page includes **Nhập kế hoạch bài dạy**. Select education level, subject, grade/training year and school year, review official source references, upload a legacy Word `.doc`, Word `.docx`, or text PDF (5MB maximum), then start analysis. School levels can select or enter a textbook/reference; university and vocational levels use a free-form program/reference field instead of school textbook options. These values only help extraction and do not select regulations. The server validates MIME and file signatures, bounds DOCX ZIP expansion, and rejects protected/scan PDFs requiring OCR. This version does not perform OCR.

The file is extracted into bounded text and processed by one background worker with five waiting slots. Raw uploads are not retained. PostgreSQL stores the job status and generated preview; restart interrupts pending jobs with a retry message. Original paragraph/page markers are retained in the prompt and requested in the preview, but remain AI output that the instructor should check. Source contents are treated as untrusted data.

Edit or remove suggested chapters/lessons before **Thêm vào giáo trình**. Apply appends chapters and TEXT lessons atomically, without deleting existing content. Imported lessons are DRAFT and not preview lessons. Repeating an already applied job returns its saved counts without duplicating lessons. Limits: 20 chapters, 100 lessons and 100,000 text characters per import. Generated and edited plain text is HTML-escaped before storage.

## Chatbot RAG

`POST /api/v1/ai/chat` retrieves before generation:

- Visitors: only curated public EduAlto information (registration, course discovery, features). No lesson, progress or private account data is queried. Public FAQ answers remain available without Gemini being configured.
- Authenticated active, verified accounts: relevant course descriptions, permitted TEXT/VIDEO/DOCUMENT lesson text, and verified education reference summaries. Published lesson content requires an active enrollment or a public preview; instructors may retrieve their own unpublished lessons. Quiz/assignment answers, student submissions and user progress are not in this corpus.
- PostgreSQL full-text search selects sources and GIN indexes accelerate matching. This is lexical RAG, without a paid embedding/vector database. Source links are constructed from authorized records or the verified policy catalog; generated source IDs are filtered against actual retrieved sources.

AI JSON format does not guarantee factual correctness. No real API round trip can be verified until the administrator supplies a valid key and quota. Free Tier prompts and files may be used by Google to improve products, so use sanitized demonstration documents; review [Gemini API terms](https://ai.google.dev/gemini-api/terms) before processing private data.

## API contract

All success responses use the existing `ApiResponse.data` wrapper.

- `POST /instructor/courses/{courseId}/curriculum-imports`: multipart `file`, `educationLevel`, `subject`, optional `grade`, `curriculum`, and `schoolYear` (default `2026-2027`); returns 202 `{id,status,preview,message}`.
- `GET /instructor/courses/{courseId}/curriculum-imports/{id}`: polls the owned job.
- `POST /instructor/courses/{courseId}/curriculum-imports/{id}/apply`: `{chapters:[{title,introduction,description,lessons:[{title,description,textContent,durationMinutes}]}]}`; returns `{chapterCount,lessonCount}`.
- `GET /ai/education-policy`: `educationLevel`, `subject`, `grade`, `schoolYear` context query parameters; returns `{references,notes,verifiedAt}`. Authenticated endpoint. No textbook parameter is used for selection.
- `POST /ai/chat`: `{message,history:[{role,text}],courseId?}`; returns `{answer,sources:[{id,title,url}],model}`. Visitors are restricted to public system knowledge regardless of supplied course ID.

Paths above are under `/api/v1`. Flyway adds import jobs and retrieval indexes automatically on backend startup. No additional AWS instance, GPU, Redis queue or Vercel secret is required.

## Official API references

- [Gemini structured outputs and REST schema](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)
- [Gemini models](https://ai.google.dev/gemini-api/docs/models)
- [API billing and quotas](https://ai.google.dev/gemini-api/docs/billing)
- [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Gemini 3.1 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite)
- [Education mapping and evidence](./education-policy-mapping.md)
