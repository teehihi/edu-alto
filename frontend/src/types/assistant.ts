export type AssistantHistoryMessage = {
  role: "user" | "assistant";
  text: string;
};

export type AssistantChatRequest = {
  message: string;
  history: AssistantHistoryMessage[];
  courseId?: string;
};

export type AssistantSource = {
  id: string;
  title: string;
  url: string;
};

export type AssistantChatResponse = {
  answer: string;
  sources: AssistantSource[];
  model: string;
};
