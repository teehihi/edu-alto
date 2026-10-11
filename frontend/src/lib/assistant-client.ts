import { apiRequest } from "@/lib/api";
import type { AssistantChatRequest, AssistantChatResponse } from "@/types/assistant";

export const assistantApi = {
  async chat(
    request: AssistantChatRequest,
    accessToken?: string | null,
    signal?: AbortSignal,
  ): Promise<AssistantChatResponse> {
    const response = await apiRequest<AssistantChatResponse>("/ai/chat", {
      method: "POST",
      body: request,
      accessToken,
      signal,
    });

    if (!response || typeof response.answer !== "string" || !response.answer.trim()) {
      throw new Error("Alto chưa trả về câu trả lời hợp lệ. Vui lòng thử lại.");
    }

    return {
      answer: response.answer,
      model: typeof response.model === "string" ? response.model : "",
      sources: Array.isArray(response.sources)
        ? response.sources.filter(
            (source) =>
              source &&
              typeof source.id === "string" &&
              typeof source.title === "string" &&
              source.title.trim() &&
              typeof source.url === "string" &&
              isTrustedSourceUrl(source.url) &&
              !hasUnsafeUrlCharacters(source.url),
          )
        : [],
    };
  },
};

function hasUnsafeUrlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return character === "\\" || character.trim() === "" || code <= 0x1f || code === 0x7f;
  });
}

function isTrustedSourceUrl(value: string): boolean {
  if (
    /^\/(?:courses|learning|instructor\/courses|register|login|forgot-password)(?:\/|$|\?)/.test(
      value,
    ) ||
    value === "/"
  ) {
    return true;
  }
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (url.hostname === "moet.gov.vn" ||
        url.hostname.endsWith(".moet.gov.vn") ||
        url.hostname.endsWith(".gov.vn") ||
        url.hostname === "chinhphu.vn" ||
        url.hostname.endsWith(".chinhphu.vn"))
    );
  } catch {
    return false;
  }
}
