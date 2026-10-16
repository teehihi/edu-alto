"use client";

import React from "react";
import type { SpotlightRect } from "./guided-tour-types";

interface GuidedTourOverlayProps {
  targetRect: SpotlightRect | null;
  padding?: number;
  radius?: number;
  onBackdropClick?: () => void;
}

export function GuidedTourOverlay({
  targetRect,
  padding = 8,
  radius = 8,
  onBackdropClick,
}: GuidedTourOverlayProps) {
  if (!targetRect) {
    return (
      <div
        className="fixed inset-0 z-[9995] bg-[#0f172a]/45 transition-opacity duration-200"
        aria-hidden="true"
        onClick={onBackdropClick}
      />
    );
  }

  const boxTop = Math.max(0, targetRect.top - padding);
  const boxLeft = Math.max(0, targetRect.left - padding);
  const boxWidth = targetRect.width + padding * 2;
  const boxHeight = targetRect.height + padding * 2;
  const boxBottom = boxTop + boxHeight;
  const boxRight = boxLeft + boxWidth;

  return (
    <div
      className="fixed inset-0 z-[9995] pointer-events-none overflow-hidden transition-opacity duration-200"
      aria-hidden="true"
    >
      {/* 4 Click-catcher barriers around the cutout to prevent outside clicks */}
      {/* Top barrier */}
      <div
        style={{ height: `${boxTop}px` }}
        className="absolute top-0 left-0 right-0 pointer-events-auto"
        onClick={onBackdropClick}
      />
      {/* Bottom barrier */}
      <div
        style={{ top: `${boxBottom}px` }}
        className="absolute bottom-0 left-0 right-0 pointer-events-auto"
        onClick={onBackdropClick}
      />
      {/* Left barrier */}
      <div
        style={{
          top: `${boxTop}px`,
          height: `${boxHeight}px`,
          width: `${boxLeft}px`,
        }}
        className="absolute left-0 pointer-events-auto"
        onClick={onBackdropClick}
      />
      {/* Right barrier */}
      <div
        style={{
          top: `${boxTop}px`,
          height: `${boxHeight}px`,
          left: `${boxRight}px`,
        }}
        className="absolute right-0 pointer-events-auto"
        onClick={onBackdropClick}
      />

      {/* Spotlight frame with cutout shadow and EduAlto primary border */}
      <div
        style={{
          top: `${boxTop}px`,
          left: `${boxLeft}px`,
          width: `${boxWidth}px`,
          height: `${boxHeight}px`,
          borderRadius: `${radius}px`,
          boxShadow:
            "0 0 0 9999px rgba(15, 23, 42, 0.45), 0 0 0 2px #20B486, 0 0 16px 2px rgba(32, 180, 134, 0.35)",
        }}
        className="absolute pointer-events-none transition-[top,left,width,height] duration-200 ease-out"
      />
    </div>
  );
}
