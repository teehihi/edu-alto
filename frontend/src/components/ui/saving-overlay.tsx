import { createPortal } from "react-dom";
import { useEffect, useRef, useSyncExternalStore } from "react";

type SavingOverlayProps = {
  message: string;
};

const subscribeToMount = () => () => {};

export function SavingOverlay({ message }: SavingOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (mounted) overlayRef.current?.focus();
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[1300] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-[3px] animate-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saving-overlay-title"
      aria-describedby="saving-overlay-description"
      aria-live="polite"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Tab") event.preventDefault();
      }}
    >
      <div className="flex min-w-56 flex-col items-center rounded-2xl border border-white/80 bg-white/95 px-7 py-6 shadow-[0_20px_60px_-15px_rgba(16,26,44,0.28)] animate-modal-content">
        <svg className="edu-saving-loader h-20 w-20" viewBox="0 0 96 96" aria-hidden="true">
          <circle cx="48" cy="48" r="41" fill="none" stroke="#DDEFE9" strokeWidth="3" />
          <circle
            className="edu-saving-loader__spin"
            cx="48"
            cy="48"
            r="41"
            fill="none"
            stroke="#20B486"
            strokeDasharray="62 196"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <g className="edu-saving-loader__mark">
            <path d="M48 18 22 29l26 12 26-12L48 18Z" fill="#20B486" />
            <path d="M30 33v8c10 7 26 7 36 0v-8L48 41 30 33Z" fill="#15966D" />
            <path
              d="M74 29v17"
              fill="none"
              stroke="#15966D"
              strokeLinecap="round"
              strokeWidth="3"
            />
            <circle cx="74" cy="49" r="3" fill="#F5C34D" />
            <path d="M13 46c12-4 24-2 35 5v27c-11-7-23-9-35-5V46Z" fill="#20B486" />
            <path
              d="M83 46c-12-4-24-2-35 5v27c11-7 23-9 35-5V46Z"
              fill="#EAF7F3"
              stroke="#20B486"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path d="M48 51v26" fill="none" stroke="#15966D" strokeWidth="2" />
            <path
              className="edu-saving-loader__spark"
              d="m48 5 2.2 5.8L56 13l-5.8 2.2L48 21l-2.2-5.8L40 13l5.8-2.2L48 5Z"
              fill="#F5C34D"
            />
          </g>
        </svg>
        <p id="saving-overlay-title" className="mt-4 text-sm font-semibold text-heading">
          {message}
        </p>
        <p id="saving-overlay-description" className="mt-1 text-xs text-muted">
          Vui lòng đợi trong giây lát
        </p>
      </div>
    </div>,
    document.body,
  );
}
