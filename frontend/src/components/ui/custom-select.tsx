"use client";

import { useEffect, useRef, useState, useId } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
  "aria-label"?: string;
}

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Chọn...",
  disabled = false,
  className,
  buttonClassName,
  menuClassName,
  align = "left",
  "aria-label": ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard events
  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  }

  function handleSelectOption(optValue: string) {
    onChange(optValue);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || selectedOption?.label || placeholder}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          "focus-ring inline-flex items-center justify-between gap-2 rounded-xl border border-[#D8E1ED] bg-white px-3 py-2 text-xs font-semibold text-heading shadow-xs transition duration-150 hover:border-slate-300 sm:text-sm",
          isOpen && "border-primary ring-1 ring-primary/20",
          disabled && "cursor-not-allowed opacity-50",
          buttonClassName
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180 text-primary"
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby={selectId}
          className={cn(
            "absolute top-full mt-1.5 z-50 min-w-[160px] overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 shadow-lg shadow-slate-200/50 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100",
            align === "right" ? "right-0" : "left-0",
            menuClassName
          )}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => handleSelectOption(option.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectOption(option.value);
                  }
                }}
                className={cn(
                  "group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition duration-150 sm:text-sm",
                  isSelected
                    ? "bg-[#EBF7F2] text-primary font-semibold"
                    : "text-heading hover:bg-slate-50 hover:text-primary"
                )}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary stroke-[2.5]" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
