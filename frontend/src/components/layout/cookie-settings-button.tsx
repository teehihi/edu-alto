"use client";

import { Settings2 } from "lucide-react";
import { cookieSettingsEventName } from "@/components/layout/cookie-consent-manager";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(cookieSettingsEventName))}
      className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-md text-slate-400 transition hover:text-primary"
    >
      <Settings2 className="size-4" aria-hidden="true" />
      Cài đặt cookie
    </button>
  );
}
