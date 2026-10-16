"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { GuidedTourProps, SpotlightRect } from "./guided-tour-types";
import { GuidedTourOverlay } from "./guided-tour-overlay";
import { GuidedTourTooltip } from "./guided-tour-tooltip";

const subscribeToMount = () => () => {};

export function GuidedTour({
  isOpen,
  steps,
  currentStep,
  onStepChange,
  onClose,
  onComplete,
  onSkip,
}: GuidedTourProps) {
  const isMounted = useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false,
  );

  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const activeStep = steps[currentStep] ?? null;
  const targetElementRef = useRef<HTMLElement | null>(null);

  const updateTargetRect = useCallback(() => {
    if (!activeStep) {
      setTargetRect(null);
      return;
    }

    let el = document.querySelector<HTMLElement>(activeStep.targetSelector);
    if (!el && activeStep.fallbackSelector) {
      el = document.querySelector<HTMLElement>(activeStep.fallbackSelector);
    }

    targetElementRef.current = el;

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [activeStep]);

  // Scroll to element & update rect when step changes or opened
  useEffect(() => {
    if (!isOpen || !activeStep) {
      setTargetRect(null);
      return;
    }

    // Attempt to locate and scroll target
    let timeoutId: NodeJS.Timeout;

    const locateAndScroll = () => {
      let el = document.querySelector<HTMLElement>(activeStep.targetSelector);
      if (!el && activeStep.fallbackSelector) {
        el = document.querySelector<HTMLElement>(activeStep.fallbackSelector);
      }

      if (el) {
        targetElementRef.current = el;
        const prefersReducedMotion =
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        el.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "center",
          inline: "nearest",
        });

        // Delay updating rect slightly until smooth scroll settles
        timeoutId = setTimeout(() => {
          updateTargetRect();
        }, 120);
      } else {
        setTargetRect(null);
      }
    };

    const rafId = requestAnimationFrame(locateAndScroll);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [isOpen, activeStep, updateTargetRect]);

  // Continuously listen to scroll and resize
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      updateTargetRect();
    };

    window.addEventListener("resize", handleUpdate, { passive: true });
    window.addEventListener("scroll", handleUpdate, { passive: true, capture: true });

    let resizeObserver: ResizeObserver | null = null;
    if (targetElementRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(handleUpdate);
      resizeObserver.observe(targetElementRef.current);
    }

    // Periodic check for dynamic DOM shifts
    const interval = setInterval(handleUpdate, 300);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      resizeObserver?.disconnect();
      clearInterval(interval);
    };
  }, [isOpen, updateTargetRect]);

  if (!isMounted || !isOpen || !activeStep || steps.length === 0) {
    return null;
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  return createPortal(
    <>
      <GuidedTourOverlay
        targetRect={targetRect}
        padding={activeStep.spotlightPadding ?? 8}
        radius={activeStep.spotlightRadius ?? 8}
      />
      <GuidedTourTooltip
        step={activeStep}
        currentStep={currentStep}
        totalSteps={steps.length}
        targetRect={targetRect}
        padding={activeStep.spotlightPadding ?? 8}
        onNext={handleNext}
        onPrev={handlePrev}
        onClose={onClose}
        onComplete={onComplete}
        onSkip={onSkip}
      />
    </>,
    document.body,
  );
}
