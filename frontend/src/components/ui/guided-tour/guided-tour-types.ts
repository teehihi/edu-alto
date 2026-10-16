import type { ReactNode } from "react";

export type TourPlacement = "auto" | "top" | "bottom" | "left" | "right";

export interface TourStep {
  id: string;
  title: string;
  description: ReactNode;
  targetSelector: string;
  fallbackSelector?: string;
  placement?: TourPlacement;
  spotlightPadding?: number;
  spotlightRadius?: number;
  interactiveTip?: ReactNode;
  canInteract?: boolean;
}

export interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface GuidedTourProps {
  isOpen: boolean;
  steps: TourStep[];
  currentStep: number;
  onStepChange: (stepIndex: number) => void;
  onClose: () => void;
  onComplete: () => void;
  onSkip?: () => void;
  className?: string;
}
