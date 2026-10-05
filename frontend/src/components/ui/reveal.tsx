"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type RevealDirection = "up" | "down" | "left" | "right" | "scale" | "fade";

const initialTransform: Record<RevealDirection, string> = {
  up: "translate3d(0, 32px, 0)",
  down: "translate3d(0, -32px, 0)",
  left: "translate3d(40px, 0, 0)",
  right: "translate3d(-40px, 0, 0)",
  scale: "scale(0.94)",
  fade: "none",
};

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Delay before the transition starts, in milliseconds. */
  delay?: number;
  /** Transition duration, in milliseconds. */
  duration?: number;
  direction?: RevealDirection;
  /** Fraction of the element that must be visible before revealing. */
  threshold?: number;
  rootMargin?: string;
}

/**
 * Fades and slides its content into view the first time it enters the viewport.
 * Uses IntersectionObserver + CSS transitions only (GPU-friendly opacity/transform).
 */
export function Reveal({
  children,
  as: Component = "div",
  className,
  delay = 0,
  duration = 800,
  direction = "up",
  threshold = 0.12,
  rootMargin = "0px 0px -8% 0px",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setIsVisible(true), 0);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const style = {
    "--reveal-from": initialTransform[direction],
    "--reveal-delay": `${delay}ms`,
    "--reveal-duration": `${duration}ms`,
  } as CSSProperties;

  return (
    <Component
      ref={ref}
      data-visible={isVisible ? "true" : "false"}
      className={cn("reveal", className)}
      style={style}
    >
      {children}
    </Component>
  );
}
