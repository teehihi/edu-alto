"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import type { SpotlightRect, TourStep } from "./guided-tour-types";
import { cn } from "@/lib/cn";

interface GuidedTourTooltipProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetRect: SpotlightRect | null;
  padding?: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onComplete: () => void;
  onSkip?: () => void;
}

function renderFormattedText(content: React.ReactNode): React.ReactNode {
  if (typeof content !== "string") return content;

  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-heading">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function GuidedTourTooltip({
  step,
  currentStep,
  totalSteps,
  targetRect,
  padding = 8,
  onNext,
  onPrev,
  onClose,
  onComplete,
  onSkip,
}: GuidedTourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    arrowPlacement: "top" | "bottom" | "left" | "right";
  }>({
    top: 100,
    left: 20,
    arrowLeft: 40,
    arrowPlacement: "top",
  });

  useEffect(() => {
    function computePosition() {
      if (!tooltipRef.current) return;
      const tooltipEl = tooltipRef.current;
      const tooltipWidth = tooltipEl.offsetWidth || 360;
      const tooltipHeight = tooltipEl.offsetHeight || 200;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gap = 12;

      if (!targetRect) {
        // Fallback: center in screen
        setPosition({
          top: Math.max(16, (viewportHeight - tooltipHeight) / 2),
          left: Math.max(16, (viewportWidth - tooltipWidth) / 2),
          arrowLeft: tooltipWidth / 2,
          arrowPlacement: "top",
        });
        return;
      }

      const boxTop = Math.max(0, targetRect.top - padding);
      const boxBottom = targetRect.top + targetRect.height + padding;
      const boxLeft = Math.max(0, targetRect.left - padding);
      const boxWidth = targetRect.width + padding * 2;
      const targetCenterX = boxLeft + boxWidth / 2;

      const spaceBelow = viewportHeight - boxBottom;
      const spaceAbove = boxTop;

      let placement = step.placement ?? "auto";

      if (placement === "auto") {
        if (spaceBelow >= tooltipHeight + gap + 16) {
          placement = "bottom";
        } else if (spaceAbove >= tooltipHeight + gap + 16) {
          placement = "top";
        } else {
          placement = spaceBelow >= spaceAbove ? "bottom" : "top";
        }
      }

      let top = 0;
      const left = Math.max(
        16,
        Math.min(targetCenterX - tooltipWidth / 2, viewportWidth - tooltipWidth - 16),
      );
      let arrowPlacement: "top" | "bottom" | "left" | "right" = "top";

      if (placement === "top") {
        top = Math.max(16, boxTop - tooltipHeight - gap);
        arrowPlacement = "bottom";
      } else {
        // Default bottom
        top = Math.min(viewportHeight - tooltipHeight - 16, boxBottom + gap);
        arrowPlacement = "top";
      }

      const arrowLeft = Math.max(18, Math.min(targetCenterX - left, tooltipWidth - 18));

      setPosition({
        top,
        left,
        arrowLeft,
        arrowPlacement,
      });
    }

    computePosition();
    window.addEventListener("resize", computePosition, { passive: true });
    window.addEventListener("scroll", computePosition, { passive: true, capture: true });

    return () => {
      window.removeEventListener("resize", computePosition);
      window.removeEventListener("scroll", computePosition, true);
    };
  }, [targetRect, step, padding]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowRight") {
        if (currentStep < totalSteps - 1) {
          event.preventDefault();
          onNext();
        }
      } else if (event.key === "ArrowLeft") {
        if (currentStep > 0) {
          event.preventDefault();
          onPrev();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, totalSteps, onNext, onPrev, onClose]);

  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div
      ref={tooltipRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-description"
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className={cn(
        "z-[9999] w-[calc(100vw-32px)] sm:w-[380px] max-w-[420px] rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xl transition-[top,left] duration-200 ease-out sm:p-5 animate-in fade-in zoom-in-95 motion-reduce:animate-none",
      )}
    >
      {/* Tooltip Arrow */}
      {targetRect && (
        <div
          aria-hidden="true"
          style={{
            left: `${position.arrowLeft}px`,
            transform: "translateX(-50%)",
          }}
          className={cn(
            "absolute size-3 rotate-45 border-slate-200/90 bg-white",
            position.arrowPlacement === "top"
              ? "-top-1.5 border-t border-l"
              : "-bottom-1.5 border-b border-r",
          )}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          Bước {currentStep + 1} / {totalSteps}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng hướng dẫn"
          className="focus-ring inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Title & Description */}
      <h4 id="tour-step-title" className="mt-2 text-sm font-semibold text-heading sm:text-base">
        {step.title}
      </h4>
      <p
        id="tour-step-description"
        className="mt-1.5 text-xs leading-relaxed text-[#52647d] sm:text-sm"
      >
        {renderFormattedText(step.description)}
      </p>

      {/* Interactive tip badge if applicable */}
      {step.interactiveTip && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-[#c4eade] bg-[#f5fbf9] px-2.5 py-1.5 text-xs font-medium text-[#087f5b]">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0">{renderFormattedText(step.interactiveTip)}</span>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onSkip ?? onClose}
          className="text-xs font-medium text-slate-500 transition hover:text-slate-800"
        >
          Bỏ qua hướng dẫn
        </button>

        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={onPrev}
              className="focus-ring inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Quay lại
            </button>
          )}

          {!isLastStep ? (
            <button
              type="button"
              onClick={onNext}
              className="focus-ring inline-flex min-h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-[#159e75] active:bg-[#128763]"
            >
              Tiếp theo
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onComplete}
              className="focus-ring inline-flex min-h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-white shadow-xs transition hover:bg-[#159e75] active:bg-[#128763]"
            >
              Hoàn thành
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
