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

const API_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1",
);

async function requestPayload(path: string, options: ApiRequestOptions = {}): Promise<unknown> {
  const { accessToken, body, headers, ...init } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isBinaryBody = typeof Blob !== "undefined" && body instanceof Blob;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: buildHeaders(headers, body, accessToken, isFormData, isBinaryBody),
      body:
        body === undefined
          ? undefined
          : isFormData || isBinaryBody
            ? (body as BodyInit)
            : JSON.stringify(body),
    });
  } catch (error) {
    if (init.signal?.aborted || (error instanceof Error && error.name === "AbortError"))
      throw error;
    throw new ApiClientError(0, {
      code: "NETWORK_ERROR",
      message: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.",
      details: [],
    });
  }

  const payload = await parseJson(response);
  if (!response.ok) {
    throw toApiError(response.status, payload);
  }

  return payload;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  return unwrapData<T>(await requestPayload(path, options));
}

export type PageResult<T> = {
  data: T[];
  meta: { page: number; size: number; totalElements: number; totalPages: number };
};

export async function apiPageRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<PageResult<T>> {
  const payload = await requestPayload(path, options);
  if (!isApiResponse<T[]>(payload) || !Array.isArray(payload.data) || !payload.meta) {
    throw new Error("Dữ liệu danh sách không hợp lệ. Vui lòng thử lại.");
  }
  return { data: payload.data, meta: payload.meta as PageResult<T>["meta"] };
}

function buildHeaders(
  headers: HeadersInit | undefined,
  body: unknown,
  accessToken: string | null | undefined,
  isFormData: boolean,
  isBinaryBody: boolean,
): Headers {
  const nextHeaders = new Headers(headers);
  if (body !== undefined && !isFormData && !isBinaryBody && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }
  if (accessToken && !nextHeaders.has("Authorization")) {
    nextHeaders.set("Authorization", `Bearer ${accessToken}`);
  }
  if (API_BASE_URL.includes("ngrok")) {
    nextHeaders.set("ngrok-skip-browser-warning", "true");
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
    details: [],
  });
}

function isApiResponse<T>(payload: unknown): payload is ApiResponse<T> {
  return Boolean(
    payload && typeof payload === "object" && "success" in payload && "data" in payload,
  );
}

function isErrorResponse(payload: unknown): payload is ErrorResponse {
  return Boolean(
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof (payload as ErrorResponse).error?.message === "string" &&
    typeof (payload as ErrorResponse).error?.code === "string",
  );
}

function normalizeBaseUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
