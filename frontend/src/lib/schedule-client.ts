import { apiRequest } from "@/lib/api";

export type CalendarEvent = {
  id: string;
  courseId: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
};

export async function fetchCalendarEvents(accessToken: string, from: Date, to: Date) {
  const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
  return apiRequest<CalendarEvent[]>(`/me/calendar-events?${params.toString()}`, { accessToken });
}

export type CalendarEventInput = Pick<
  CalendarEvent,
  "title" | "description" | "startsAt" | "endsAt"
> & {
  courseId?: string | null;
};

export async function createCalendarEvent(accessToken: string, input: CalendarEventInput) {
  return apiRequest<CalendarEvent>("/me/calendar-events", {
    method: "POST",
    accessToken,
    body: input,
  });
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  input: CalendarEventInput,
) {
  return apiRequest<CalendarEvent>(`/me/calendar-events/${encodeURIComponent(eventId)}`, {
    method: "PUT",
    accessToken,
    body: input,
  });
}

export async function deleteCalendarEvent(accessToken: string, eventId: string) {
  return apiRequest<void>(`/me/calendar-events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    accessToken,
  });
}
