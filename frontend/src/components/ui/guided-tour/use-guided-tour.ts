"use client";

import { useCallback, useEffect, useState } from "react";
import type { TourStep } from "./guided-tour-types";

interface UseGuidedTourOptions {
  steps: TourStep[];
  storageKey?: string;
  autoStart?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function useGuidedTour({
  steps,
  storageKey,
  autoStart = false,
  onComplete,
  onSkip,
}: UseGuidedTourOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Initialize storage status and auto-start
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "true") {
        setHasCompleted(true);
      } else if (autoStart) {
        // Delay opening slightly to let UI settle
        const timer = setTimeout(() => {
          setIsOpen(true);
          setCurrentStep(0);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // Storage unavailable / blocked
    }
  }, [storageKey, autoStart]);

  const startTour = useCallback(
    (startStep = 0) => {
      setCurrentStep(Math.max(0, Math.min(startStep, steps.length - 1)));
      setIsOpen(true);
    },
    [steps.length],
  );

  const closeTour = useCallback(() => {
    setIsOpen(false);
  }, []);

  const completeTour = useCallback(() => {
    setIsOpen(false);
    setHasCompleted(true);
    if (storageKey && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {
        // Ignore storage errors
      }
    }
    onComplete?.();
  }, [storageKey, onComplete]);

  const skipTour = useCallback(() => {
    setIsOpen(false);
    setHasCompleted(true);
    if (storageKey && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKey, "true");
      } catch {
        // Ignore storage errors
      }
    }
    onSkip?.();
  }, [storageKey, onSkip]);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev < steps.length - 1) {
        return prev + 1;
      }
      completeTour();
      return prev;
    });
  }, [steps.length, completeTour]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback(
    (index: number) => {
      setCurrentStep(Math.max(0, Math.min(index, steps.length - 1)));
    },
    [steps.length],
  );

  const resetTour = useCallback(() => {
    if (storageKey && typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Ignore storage errors
      }
    }
    setHasCompleted(false);
    setCurrentStep(0);
  }, [storageKey]);

  return {
    isOpen,
    currentStep,
    hasCompleted,
    startTour,
    closeTour,
    completeTour,
    skipTour,
    nextStep,
    prevStep,
    goToStep,
    resetTour,
    setCurrentStep,
  };
}
