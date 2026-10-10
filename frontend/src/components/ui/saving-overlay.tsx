import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";

type SavingOverlayProps = {
  message: string;
};

const subscribeToMount = () => () => {};

export function SavingOverlay({ message }: SavingOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const loaderId = `edu-saving-${useId().replace(/:/g, "")}`;
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
        <svg className="edu-pl1" viewBox="0 0 128 128" aria-hidden="true">
          <defs>
            <linearGradient id={`${loaderId}-gradient`} x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#000" offset="0%" />
              <stop stopColor="#fff" offset="100%" />
            </linearGradient>
            <mask id={`${loaderId}-mask`}>
              <rect x="0" y="0" width="128" height="128" fill={`url(#${loaderId}-gradient)`} />
            </mask>
          </defs>
          <g fill="#20B486">
            <g className="edu-pl1__g">
              <g transform="translate(20,20) rotate(0,44,44)">
                <g className="edu-pl1__rect-g">
                  <rect className="edu-pl1__rect" width="40" height="40" rx="8" ry="8" />
                  <rect
                    className="edu-pl1__rect"
                    transform="translate(0,48)"
                    width="40"
                    height="40"
                    rx="8"
                    ry="8"
                  />
                </g>
                <g transform="rotate(180,44,44)" className="edu-pl1__rect-g">
                  <rect className="edu-pl1__rect" width="40" height="40" rx="8" ry="8" />
                  <rect
                    className="edu-pl1__rect"
                    transform="translate(0,48)"
                    width="40"
                    height="40"
                    rx="8"
                    ry="8"
                  />
                </g>
              </g>
            </g>
          </g>
          <g mask={`url(#${loaderId}-mask)`} fill="#8EDFC5">
            <g className="edu-pl1__g">
              <g transform="translate(20,20) rotate(0,44,44)">
                <g className="edu-pl1__rect-g">
                  <rect className="edu-pl1__rect" width="40" height="40" rx="8" ry="8" />
                  <rect
                    className="edu-pl1__rect"
                    transform="translate(0,48)"
                    width="40"
                    height="40"
                    rx="8"
                    ry="8"
                  />
                </g>
                <g transform="rotate(180,44,44)" className="edu-pl1__rect-g">
                  <rect className="edu-pl1__rect" width="40" height="40" rx="8" ry="8" />
                  <rect
                    className="edu-pl1__rect"
                    transform="translate(0,48)"
                    width="40"
                    height="40"
                    rx="8"
                    ry="8"
                  />
                </g>
              </g>
            </g>
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
