"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";

const consentCookieName = "edualto-cookie-consent";
const consentMaxAge = 60 * 60 * 24 * 180;
const openSettingsEvent = "edualto:open-cookie-settings";
const consentChangedEvent = "edualto:cookie-consent-changed";

type CookiePreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

function readPreferences(): CookiePreferences | null {
  const encodedCookie = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${consentCookieName}=`))
    ?.slice(consentCookieName.length + 1);

  if (!encodedCookie) return null;

  try {
    const value: unknown = JSON.parse(decodeURIComponent(encodedCookie));
    if (
      typeof value === "object" &&
      value !== null &&
      "necessary" in value &&
      value.necessary === true &&
      "analytics" in value &&
      typeof value.analytics === "boolean" &&
      "marketing" in value &&
      typeof value.marketing === "boolean"
    ) {
      return value as CookiePreferences;
    }
  } catch {
    return null;
  }

  return null;
}

function storePreferences(analytics: boolean, marketing: boolean) {
  const value: CookiePreferences = {
    necessary: true,
    analytics,
    marketing,
    updatedAt: new Date().toISOString(),
  };
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${consentCookieName}=${encodeURIComponent(JSON.stringify(value))}; Max-Age=${consentMaxAge}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new Event(consentChangedEvent));
  return value;
}

function subscribeToPreferences(onChange: () => void) {
  window.addEventListener(consentChangedEvent, onChange);
  return () => window.removeEventListener(consentChangedEvent, onChange);
}

function getPreferencesSnapshot() {
  return JSON.stringify(readPreferences());
}

function Switch({
  id,
  checked,
  onChange,
  disabled = false,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="checkbox-wrapper-5 shrink-0 pt-0.5">
      <div className="check">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
        />
        <label htmlFor={id} />
      </div>
    </div>
  );
}

export function CookieConsentManager() {
  const preferencesSnapshot = useSyncExternalStore(
    subscribeToPreferences,
    getPreferencesSnapshot,
    () => "loading",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analyticsDraft, setAnalyticsDraft] = useState(false);
  const [marketingDraft, setMarketingDraft] = useState(false);

  const preferences =
    preferencesSnapshot === "loading"
      ? null
      : (JSON.parse(preferencesSnapshot) as CookiePreferences | null);

  const visible = !preferences && preferencesSnapshot !== "loading";

  useEffect(() => {
    const openSettings = () => {
      const saved = readPreferences();
      setAnalyticsDraft(saved?.analytics ?? false);
      setMarketingDraft(saved?.marketing ?? false);
      setIsModalOpen(true);
    };

    window.addEventListener(openSettingsEvent, openSettings);
    return () => window.removeEventListener(openSettingsEvent, openSettings);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isModalOpen) {
        setIsModalOpen(false);
      }
    }
    if (isModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen]);

  function handleAcceptAll() {
    storePreferences(true, true);
    setIsModalOpen(false);
  }

  function handleSaveCustom() {
    storePreferences(analyticsDraft, marketingDraft);
    setIsModalOpen(false);
  }

  function handleRejectNonEssential() {
    storePreferences(false, false);
    setIsModalOpen(false);
  }

  function handleOpenModal() {
    const saved = readPreferences();
    setAnalyticsDraft(saved?.analytics ?? false);
    setMarketingDraft(saved?.marketing ?? false);
    setIsModalOpen(true);
  }

  return (
    <>
      {/* Floating Cookie Card (Bottom-Left) */}
      {preferencesSnapshot !== "loading" && visible && !isModalOpen ? (
        <div
          role="region"
          aria-label="Thông báo quyền riêng tư"
          aria-live="polite"
          className="[--shadow:rgba(60,64,67,0.3)_0_1px_2px_0,rgba(60,64,67,0.15)_0_2px_6px_2px] fixed bottom-5 left-5 z-[100] w-4/5 h-auto rounded-2xl bg-white [box-shadow:var(--shadow)] max-w-[300px] sm:bottom-8 sm:left-8 animate-page"
        >
          <div className="flex flex-col items-center justify-between pt-9 px-6 pb-6 relative">
            <span className="relative mx-auto -mt-16 mb-8">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" height={46} width={65}>
                <path
                  stroke="#000"
                  fill="#EAB789"
                  d="M49.157 15.69L44.58.655l-12.422 1.96L21.044.654l-8.499 2.615-6.538 5.23-4.576 9.153v11.114l4.576 8.5 7.846 5.23 10.46 1.96 7.845-2.614 9.153 2.615 11.768-2.615 7.846-7.846 1.96-5.884.655-7.191-7.846-1.308-6.537-3.922z"
                />
                <path
                  fill="#9C6750"
                  d="M32.286 3.749c-6.94 3.65-11.69 11.053-11.69 19.591 0 8.137 4.313 15.242 10.724 19.052a20.513 20.513 0 01-8.723 1.937c-11.598 0-21-9.626-21-21.5 0-11.875 9.402-21.5 21-21.5 3.495 0 6.79.874 9.689 2.42z"
                  clipRule="evenodd"
                  fillRule="evenodd"
                />
                <path
                  fill="#634647"
                  d="M64.472 20.305a.954.954 0 00-1.172-.824 4.508 4.508 0 01-3.958-.934.953.953 0 00-1.076-.11c-.46.252-.977.383-1.502.382a3.154 3.154 0 01-2.97-2.11.954.954 0 00-.833-.634 4.54 4.54 0 01-4.205-4.507c.002-.23.022-.46.06-.687a.952.952 0 00-.213-.767 3.497 3.497 0 01-.614-3.5.953.953 0 00-.382-1.138 3.522 3.522 0 01-1.5-3.992.951.951 0 00-.762-1.227A22.611 22.611 0 0032.3 2.16 22.41 22.41 0 0022.657.001a22.654 22.654 0 109.648 43.15 22.644 22.644 0 0032.167-22.847zM22.657 43.4a20.746 20.746 0 110-41.493c2.566-.004 5.11.473 7.501 1.407a22.64 22.64 0 00.003 38.682 20.6 20.6 0 01-7.504 1.404zm19.286 0a20.746 20.746 0 112.131-41.384 5.417 5.417 0 001.918 4.635 5.346 5.346 0 00-.133 1.182A5.441 5.441 0 0046.879 11a5.804 5.804 0 00-.028.568 6.456 6.456 0 005.38 6.345 5.053 5.053 0 006.378 2.472 6.412 6.412 0 004.05 1.12 20.768 20.768 0 01-20.716 21.897z"
                />
                <path
                  fill="#644647"
                  d="M54.962 34.3a17.719 17.719 0 01-2.602 2.378.954.954 0 001.14 1.53 19.637 19.637 0 002.884-2.634.955.955 0 00-1.422-1.274z"
                />
                <path
                  strokeWidth="1.8"
                  stroke="#644647"
                  fill="#845556"
                  d="M44.5 32.829c-.512 0-1.574.215-2 .5-.426.284-.342.263-.537.736a2.59 2.59 0 104.98.99c0-.686-.458-1.241-.943-1.726-.485-.486-.814-.5-1.5-.5zm-30.916-2.5c-.296 0-.912.134-1.159.311-.246.177-.197.164-.31.459a1.725 1.725 0 00-.086.932c.058.312.2.6.41.825.21.226.477.38.768.442.291.062.593.03.867-.092s.508-.329.673-.594a1.7 1.7 0 00.253-.896c0-.428-.266-.774-.547-1.076-.281-.302-.471-.31-.869-.311zm17.805-11.375c-.143-.492-.647-1.451-1.04-1.78-.392-.33-.348-.255-.857-.31a2.588 2.588 0 10.441 5.06c.66-.194 1.064-.788 1.395-1.39.33-.601.252-.92.06-1.58zm-22 2c-.143-.492-.647-1.451-1.04-1.78-.391-.33-.347-.255-.856-.31a2.589 2.589 0 10.44 5.06c.66-.194 1.064-.788 1.395-1.39.33-.601.252-.92.06-1.58zM38.112 7.329c-.395 0-1.216.179-1.545.415-.328.236-.263.218-.415.611-.151.393-.19.826-.114 1.243.078.417.268.8.548 1.1.28.301.636.506 1.024.59.388.082.79.04 1.155-.123.366-.163.678-.438.898-.792.22-.354.337-.77.337-1.195 0-.57-.354-1.031-.73-1.434-.374-.403-.628-.415-1.158-.415zm-19.123.703c.023-.296-.062-.92-.219-1.18-.157-.26-.148-.21-.432-.347a1.726 1.726 0 00-.922-.159 1.654 1.654 0 00-.856.344 1.471 1.471 0 00-.501.73c-.085.285-.077.589.023.872.1.282.287.532.538.718a1.7 1.7 0 00.873.323c.427.033.793-.204 1.116-.46.324-.256.347-.445.38-.841z"
                />
                <path
                  fill="#634647"
                  d="M15.027 15.605a.954.954 0 00-1.553 1.108l1.332 1.863a.955.955 0 001.705-.77.955.955 0 00-.153-.34l-1.331-1.861z"
                />
                <path
                  fill="#644647"
                  d="M43.31 23.21a.954.954 0 101.553-1.11l-1.266-1.772a.954.954 0 10-1.552 1.11l1.266 1.772z"
                />
                <path
                  fill="#634647"
                  d="M19.672 35.374a.954.954 0 00-.954.953v2.363a.954.954 0 001.907 0v-2.362a.954.954 0 00-.953-.954z"
                />
                <path
                  fill="#644647"
                  d="M33.129 29.18l-2.803 1.065a.953.953 0 00-.053 1.764.957.957 0 00.73.022l2.803-1.065a.953.953 0 00-.677-1.783v-.003zm24.373-3.628l-2.167.823a.956.956 0 00-.054 1.764.954.954 0 00.73.021l2.169-.823a.954.954 0 10-.678-1.784v-.001z"
                />
              </svg>
            </span>
            <h5 className="text-sm font-semibold mb-2 text-left mr-auto text-zinc-700">
              Quyền riêng tư của bạn rất quan trọng với EduAlto
            </h5>
            <p className="w-full mb-4 text-sm text-justify text-zinc-600">
              Chúng tôi xử lý thông tin cá nhân của bạn để đo lường và cải thiện trang web cũng như
              dịch vụ, hỗ trợ các chiến dịch và cung cấp nội dung cá nhân hóa. Để biết thêm thông
              tin, vui lòng xem{" "}
              <Link
                href="/cookie-policy"
                className="mb-2 text-sm cursor-pointer font-semibold transition-colors hover:text-primary underline underline-offset-2"
              >
                Chính sách cookie
              </Link>
              .
            </p>
            <button
              type="button"
              onClick={handleOpenModal}
              className="mb-2 text-sm mr-auto text-zinc-600 cursor-pointer font-semibold transition-colors hover:text-primary hover:underline underline-offset-2"
            >
              Tùy chọn khác
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="absolute font-semibold right-6 bottom-6 cursor-pointer py-2 px-8 w-max break-keep text-sm rounded-lg transition-colors text-white bg-primary hover:bg-primary-dark"
            >
              Chấp nhận
            </button>
          </div>
        </div>
      ) : null}

      {/* Interactive Cookie Preferences Modal */}
      {isModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
          />

          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl animate-page space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 id="cookie-modal-title" className="text-lg font-bold text-heading">
                  Tùy chọn cookie & Quyền riêng tư
                </h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Tùy chỉnh các loại cookie mà bạn cho phép EduAlto sử dụng trên trình duyệt của
                  bạn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="focus-ring rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Essential Cookies */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-heading">Cookie thiết yếu</span>
                    <span className="rounded bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                      Bắt buộc
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-muted">
                    Cần thiết để duy trì đăng nhập bảo mật, lưu giỏ hàng và đảm bảo hệ thống vận
                    hành ổn định. Không thể tắt.
                  </p>
                </div>
                <Switch
                  id="cookie-necessary"
                  checked
                  disabled
                  onChange={() => {}}
                  label="Cookie thiết yếu (Bắt buộc)"
                />
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="space-y-1">
                  <span className="text-sm font-bold text-heading">Cookie phân tích</span>
                  <p className="text-xs leading-5 text-muted">
                    Giúp chúng tôi đo lường lượt truy cập và tần suất sử dụng tính năng nhằm liên
                    tục nâng cấp trải nghiệm người học.
                  </p>
                </div>
                <Switch
                  id="cookie-analytics"
                  checked={analyticsDraft}
                  onChange={setAnalyticsDraft}
                  label="Cookie phân tích"
                />
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="space-y-1">
                  <span className="text-sm font-bold text-heading">Cookie tiếp thị & gợi ý</span>
                  <p className="text-xs leading-5 text-muted">
                    Hỗ trợ gợi ý các khóa học phù hợp với mục tiêu phát triển và sở thích học tập
                    của bạn.
                  </p>
                </div>
                <Switch
                  id="cookie-marketing"
                  checked={marketingDraft}
                  onChange={setMarketingDraft}
                  label="Cookie tiếp thị & gợi ý"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="focus-ring rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:bg-slate-100 text-center"
              >
                Chỉ cookie thiết yếu
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="focus-ring flex-1 sm:flex-none rounded-xl border border-primary bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-primary-dark active:bg-primary-dark text-center"
                >
                  Lưu lựa chọn
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="focus-ring flex-1 sm:flex-none rounded-xl border border-slate-800 bg-[#101A2C] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800 active:bg-slate-900 text-center"
                >
                  Chấp nhận tất cả
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export const cookieSettingsEventName = openSettingsEvent;
