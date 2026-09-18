import type { ApiErrorBody } from "@/types/auth";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta: unknown;
};

type ErrorResponse = {
  success: false;
  error: ApiErrorBody;
  timestamp?: string;
  path?: string;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorBody["details"];

  constructor(status: number, error: ApiErrorBody) {
    super(error.message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = error.code;
    this.details = error.details;
  }
}

export type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  accessToken?: string | null;
  body?: unknown;
  headers?: HeadersInit;
};

const API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1");

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { accessToken, body, headers, ...init } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(headers, body, accessToken),
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    throw toApiError(response.status, payload);
  }

  return unwrapData<T>(payload);
}

function buildHeaders(headers: HeadersInit | undefined, body: unknown, accessToken: string | null | undefined): Headers {
  const nextHeaders = new Headers(headers);
  if (body !== undefined && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }
  if (accessToken && !nextHeaders.has("Authorization")) {
    nextHeaders.set("Authorization", `Bearer ${accessToken}`);
  }
  return nextHeaders;
}

async function parseJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function unwrapData<T>(payload: unknown): T {
  if (isApiResponse<T>(payload)) {
    return payload.data;
  }
  return payload as T;
}

function toApiError(status: number, payload: unknown): ApiClientError {
  if (isErrorResponse(payload)) {
    return new ApiClientError(status, payload.error);
  }

  return new ApiClientError(status, {
    code: "REQUEST_FAILED",
    message: "Không thể xử lý yêu cầu. Vui lòng thử lại.",
    details: []
  });
}

function isApiResponse<T>(payload: unknown): payload is ApiResponse<T> {
  return Boolean(payload && typeof payload === "object" && "success" in payload && "data" in payload);
}

function isErrorResponse(payload: unknown): payload is ErrorResponse {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as ErrorResponse).error?.message === "string" &&
      typeof (payload as ErrorResponse).error?.code === "string"
  );
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
