import { apiRequest, ApiClientError } from "./api";

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a Vietnamese error when the network is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiRequest("/courses")).rejects.toMatchObject({
      name: "ApiClientError",
      code: "NETWORK_ERROR",
      status: 0,
      message: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.",
    });
  });

  it("preserves cancellation so callers can ignore aborted requests", async () => {
    const controller = new AbortController();
    controller.abort();
    const error = new DOMException("Request aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    await expect(apiRequest("/courses", { signal: controller.signal })).rejects.toBe(error);
  });

  it("preserves backend validation details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Dữ liệu không hợp lệ",
              details: [{ field: "email", message: "Email không hợp lệ" }],
            },
          }),
          { status: 400 },
        ),
      ),
    );
    const request = apiRequest("/auth/register", { method: "POST", body: {} });
    await expect(request).rejects.toBeInstanceOf(ApiClientError);
    await expect(request).rejects.toMatchObject({
      status: 400,
      details: [{ field: "email", message: "Email không hợp lệ" }],
    });
  });
});
