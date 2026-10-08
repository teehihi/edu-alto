"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Bell, ImagePlus, Megaphone, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useAuth } from "@/features/auth/auth-client";
import { ApiClientError } from "@/lib/api";
import { uploadCourseThumbnail } from "@/lib/instructor-course-client";
import {
  createInstructorNotification,
  deleteInstructorNotification,
  fetchAllInstructorNotifications,
  publishInstructorNotification,
  updateInstructorNotification,
  type InstructorNotification,
  type InstructorNotificationAudience,
  type InstructorNotificationPayload,
} from "@/lib/instructor-notification-client";

type NotificationForm = {
  title: string;
  description: string;
  linkUrl: string;
  audience: InstructorNotificationAudience;
  startsAt: string;
  endsAt: string;
  imageKey: string | null;
};

const emptyForm: NotificationForm = {
  title: "",
  description: "",
  linkUrl: "",
  audience: "ALL_STUDENTS",
  startsAt: "",
  endsAt: "",
  imageKey: null,
};

function toForm(item: InstructorNotification): NotificationForm {
  const toLocalInput = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  return {
    title: item.title,
    description: item.description,
    linkUrl: item.linkUrl ?? "",
    audience: item.audience,
    startsAt: toLocalInput(item.startsAt),
    endsAt: toLocalInput(item.endsAt),
    imageKey: item.imageKey,
  };
}

function toPayload(form: NotificationForm): InstructorNotificationPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    linkUrl: form.linkUrl.trim() || null,
    audience: form.audience,
    startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
    endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
    imageKey: form.imageKey,
  };
}

function formatDate(value: string | null) {
  if (!value) return "Chưa đặt lịch";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function audienceLabel(value: InstructorNotificationAudience) {
  return value === "ALL_STUDENTS" ? "Tất cả học viên" : "Học viên đã ghi danh";
}

export function InstructorNotificationsPanel() {
  const { accessToken, isAuthenticated, loading: authLoading } = useAuth();
  const [items, setItems] = useState<InstructorNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED">("ALL");
  const [editing, setEditing] = useState<InstructorNotification | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<NotificationForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const publishAfterSubmitRef = useRef(false);

  const load = useCallback(async () => {
    if (!accessToken || !isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const result = await fetchAllInstructorNotifications(accessToken);
      setItems(result);
    } catch (error) {
      setLoadError(
        error instanceof ApiClientError
          ? error.message
          : "Không thể tải danh sách thông báo. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAuthenticated]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  const closeForm = () => {
    if (saving) return;
    setEditing(null);
    setCreating(false);
    setForm(emptyForm);
    setImageFile(null);
    setFormError("");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setImageFile(null);
    setFormError("");
    setCreating(true);
  };

  const openEdit = (item: InstructorNotification) => {
    setEditing(item);
    setForm(toForm(item));
    setImageFile(null);
    setFormError("");
    setCreating(true);
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const publishAfterSave = publishAfterSubmitRef.current;
    publishAfterSubmitRef.current = false;
    if (!accessToken) return;
    if (!form.title.trim() || !form.description.trim()) {
      setFormError("Vui lòng nhập tiêu đề và nội dung thông báo.");
      return;
    }
    if (form.linkUrl.trim()) {
      try {
        const url = new URL(form.linkUrl.trim());
        if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid");
      } catch {
        setFormError("Đường dẫn cần bắt đầu bằng http:// hoặc https://.");
        return;
      }
    }
    if (form.startsAt && form.endsAt && Date.parse(form.endsAt) < Date.parse(form.startsAt)) {
      setFormError("Thời điểm kết thúc phải sau thời điểm bắt đầu.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      let imageKey = form.imageKey;
      if (imageFile) {
        const upload = await uploadCourseThumbnail(imageFile, accessToken);
        imageKey = upload.objectKey;
      }
      const payload = toPayload({ ...form, imageKey });
      let saved = editing
        ? await updateInstructorNotification(editing.id, payload, accessToken)
        : await createInstructorNotification(payload, accessToken);
      if (publishAfterSave && saved.status !== "PUBLISHED") {
        saved = await publishInstructorNotification(saved.id, accessToken);
      }
      setItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setNotice(saved.status === "PUBLISHED" ? "Thông báo đã được xuất bản." : "Đã lưu bản nháp.");
      setCreating(false);
      setEditing(null);
      setForm(emptyForm);
      setImageFile(null);
    } catch (error) {
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Không thể lưu thông báo. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function publish(item: InstructorNotification) {
    if (!accessToken) return;
    setActionId(item.id);
    setLoadError("");
    try {
      const updated = await publishInstructorNotification(item.id, accessToken);
      setItems((current) => current.map((entry) => (entry.id === updated.id ? updated : entry)));
      setNotice("Thông báo đã được xuất bản.");
    } catch (error) {
      setLoadError(
        error instanceof ApiClientError ? error.message : "Không thể xuất bản thông báo.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function remove(item: InstructorNotification) {
    if (!accessToken || !window.confirm(`Xóa thông báo “${item.title}”?`)) return;
    setActionId(item.id);
    setLoadError("");
    try {
      await deleteInstructorNotification(item.id, accessToken);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setNotice("Đã xóa thông báo.");
    } catch (error) {
      setLoadError(error instanceof ApiClientError ? error.message : "Không thể xóa thông báo.");
    } finally {
      setActionId(null);
    }
  }

  const visibleItems = items.filter((item) => filter === "ALL" || item.status === filter);

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
        Vui lòng đăng nhập bằng tài khoản giảng viên để quản lý thông báo.
      </div>
    );
  }

  return (
    <section aria-label="Quản lý thông báo">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-heading">Thông báo của bạn</h2>
          <p className="mt-1 text-sm text-muted">Soạn tin và chia sẻ cập nhật với học viên.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-[#159e75] active:bg-[#128763]"
        >
          <Plus size={17} aria-hidden="true" /> Tạo thông báo mới
        </button>
      </div>
      {notice ? (
        <div
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {notice}
        </div>
      ) : null}
      {loadError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {loadError}{" "}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-2 font-semibold underline"
          >
            Thử lại
          </button>
        </div>
      ) : null}
      <div className="mb-4 flex gap-2" role="group" aria-label="Lọc thông báo">
        {(
          [
            ["ALL", "Tất cả"],
            ["DRAFT", "Bản nháp"],
            ["PUBLISHED", "Đã xuất bản"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`focus-ring min-h-9 rounded-full px-3 text-sm font-medium transition ${filter === value ? "bg-emerald-50 text-primary" : "text-slate-600 hover:bg-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {loading || authLoading ? (
        <div className="space-y-3" aria-label="Đang tải thông báo" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : null}
      {!loading && !loadError && visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <h3 className="mt-3 font-semibold text-heading">Chưa có thông báo</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Tạo thông báo để chia sẻ lịch học, cập nhật khóa học hoặc tin mới với học viên.
          </p>
        </div>
      ) : null}
      {!loading && visibleItems.length > 0 ? (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5"
            >
              <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md bg-emerald-50 text-primary">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : item.imageKey ? (
                  <span className="text-xs font-medium">Đã đính kèm ảnh</span>
                ) : (
                  <Megaphone size={27} aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-heading">{item.title}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                  >
                    {item.status === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.description}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>{audienceLabel(item.audience)}</span>
                  <span>{formatDate(item.publishedAt ?? item.updatedAt)}</span>
                  {item.linkUrl ? (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Mở liên kết
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 gap-2 sm:flex-col">
                {item.status === "DRAFT" ? (
                  <button
                    type="button"
                    disabled={actionId === item.id}
                    onClick={() => void publish(item)}
                    className="focus-ring inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-white hover:bg-[#159e75] disabled:opacity-50"
                  >
                    <Send size={14} aria-hidden="true" /> Xuất bản
                  </button>
                ) : null}
                {item.status === "DRAFT" ? (
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="focus-ring inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={14} aria-hidden="true" /> Chỉnh sửa
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={actionId === item.id}
                  aria-label={`Xóa ${item.title}`}
                  onClick={() => void remove(item)}
                  className="focus-ring inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 size={14} aria-hidden="true" /> Xóa
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {creating ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-form-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="notification-form-title" className="text-xl font-semibold text-heading">
                  {editing ? "Chỉnh sửa thông báo" : "Tạo thông báo mới"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Nội dung sẽ được lưu cho đúng tài khoản giảng viên.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng biểu mẫu"
                onClick={closeForm}
                className="focus-ring rounded-md p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} aria-hidden="true" />
              </button>
            </div>
            <form ref={formRef} onSubmit={(event) => void save(event)} className="space-y-4">
              <label
                className="block text-sm font-medium text-heading"
                htmlFor="notification-title"
              >
                Tiêu đề
                <input
                  id="notification-title"
                  required
                  maxLength={160}
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3.5 font-normal"
                  placeholder="Ví dụ: Lịch học tuần này"
                />
              </label>
              <label
                className="block text-sm font-medium text-heading"
                htmlFor="notification-description"
              >
                Nội dung
                <textarea
                  id="notification-description"
                  required
                  rows={4}
                  maxLength={5000}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className="focus-ring mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-3 font-normal"
                  placeholder="Chia sẻ nội dung với học viên…"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label
                  className="block text-sm font-medium text-heading"
                  htmlFor="notification-audience"
                >
                  Đối tượng nhận
                  <select
                    id="notification-audience"
                    value={form.audience}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        audience: event.target.value as InstructorNotificationAudience,
                      }))
                    }
                    className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-normal"
                  >
                    <option value="ALL_STUDENTS">Tất cả học viên</option>
                    <option value="ENROLLED_STUDENTS">Học viên đã ghi danh</option>
                  </select>
                </label>
                <label
                  className="block text-sm font-medium text-heading"
                  htmlFor="notification-link"
                >
                  Liên kết (không bắt buộc)
                  <input
                    id="notification-link"
                    type="url"
                    value={form.linkUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, linkUrl: event.target.value }))
                    }
                    className="focus-ring mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
                    placeholder="https://…"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DateTimePicker
                  label="Bắt đầu hiển thị"
                  value={form.startsAt}
                  onChange={(value) => setForm((current) => ({ ...current, startsAt: value }))}
                />
                <DateTimePicker
                  label="Kết thúc hiển thị"
                  value={form.endsAt}
                  onChange={(value) => setForm((current) => ({ ...current, endsAt: value }))}
                />
              </div>
              <div>
                <label
                  htmlFor="notification-image"
                  className="flex min-h-[76px] cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 transition hover:border-primary hover:bg-emerald-50/50"
                >
                  <ImagePlus className="h-6 w-6 text-primary" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-heading">Ảnh đính kèm</span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {imageFile?.name ??
                        (form.imageKey
                          ? "Đã có ảnh · chọn ảnh khác để thay"
                          : "PNG, JPG hoặc WebP · tối đa 5 MB")}
                    </span>
                  </span>
                </label>
                <input
                  id="notification-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file && !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
                      setFormError("Vui lòng chọn ảnh PNG, JPG hoặc WebP.");
                      event.target.value = "";
                      return;
                    }
                    if (file && file.size > 5 * 1024 * 1024) {
                      setFormError("Ảnh không được lớn hơn 5 MB.");
                      event.target.value = "";
                      return;
                    }
                    setImageFile(file);
                    setFormError("");
                  }}
                />
                {form.imageKey ? (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((current) => ({ ...current, imageKey: null }));
                      setImageFile(null);
                    }}
                    className="focus-ring mt-2 text-xs font-medium text-rose-700 hover:underline"
                  >
                    Gỡ ảnh
                  </button>
                ) : null}
              </div>
              {formError ? (
                <p role="alert" className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {formError}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeForm}
                  className="focus-ring min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  onClick={() => {
                    publishAfterSubmitRef.current = false;
                  }}
                  className="focus-ring min-h-11 rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-50"
                >
                  {saving ? "Đang lưu…" : "Lưu bản nháp"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    publishAfterSubmitRef.current = true;
                    formRef.current?.requestSubmit();
                  }}
                  className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-[#159e75] disabled:cursor-wait disabled:opacity-50"
                >
                  <Send size={15} aria-hidden="true" /> {saving ? "Đang xuất bản…" : "Xuất bản"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
