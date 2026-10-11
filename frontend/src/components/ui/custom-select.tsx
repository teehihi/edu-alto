"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { createPortal } from "react-dom";
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
  required?: boolean;
  allowCustomValue?: boolean;
  maxLength?: number;
  pattern?: string;
  portal?: boolean;
  className?: string;
  buttonClassName?: string;
  inputClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
  "aria-label"?: string;
  "aria-describedby"?: string;
}

function searchText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").toLocaleLowerCase("vi");
}

export function CustomSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Chọn...",
  disabled = false,
  required = false,
  allowCustomValue = false,
  maxLength,
  pattern,
  portal = false,
  className,
  buttonClassName,
  inputClassName,
  menuClassName,
  align = "left",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<CSSProperties | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const selectId = id || generatedId;
  const listId = `${selectId}-options`;
  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const text = searchText(query.trim());
    return allowCustomValue && text
      ? options.filter((option) => searchText(option.label).includes(text))
      : options;
  }, [allowCustomValue, options, query]);
  const resolvedIndex = Math.min(activeIndex, Math.max(0, filteredOptions.length - 1));
  const activeId = filteredOptions.length > 0 ? `${listId}-${resolvedIndex}` : undefined;

  function openMenu(last = false) {
    if (disabled) return;
    setQuery("");
    const index = options.findIndex((option) => option.value === value);
    setActiveIndex(index >= 0 ? index : last ? Math.max(0, options.length - 1) : 0);
    setIsOpen(true);
  }

  function selectOption(optionValue: string) {
    if (disabled) return;
    onChange(optionValue);
    setQuery("");
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!isOpen) return;
    const outside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("touchstart", outside);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("touchstart", outside);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !portal) return;
    const dialog = containerRef.current?.closest<HTMLElement>('[role="dialog"]');
    const target = dialog || document.body;
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const bounds = dialog?.getBoundingClientRect();
      const topBound = Math.max(8, (bounds?.top ?? 0) + 8);
      const bottomBound = Math.min(
        window.innerHeight - 8,
        (bounds?.bottom ?? window.innerHeight) - 8,
      );
      const leftBound = Math.max(8, (bounds?.left ?? 0) + 8);
      const rightBound = Math.min(window.innerWidth - 8, (bounds?.right ?? window.innerWidth) - 8);
      const width = Math.max(1, Math.min(Math.max(160, rect.width), rightBound - leftBound));
      const below = bottomBound - rect.bottom - 6;
      const above = rect.top - topBound - 6;
      const expectedHeight = Math.min(280, Math.max(1, filteredOptions.length) * 44 + 16);
      const opensUp = below < expectedHeight && above > below;
      const height = Math.max(40, Math.min(expectedHeight, opensUp ? above : below));
      const left = Math.max(
        leftBound,
        Math.min(align === "right" ? rect.right - width : rect.left, rightBound - width),
      );
      setPosition({
        position: "fixed",
        top: opensUp ? Math.max(topBound, rect.top - height - 6) : rect.bottom + 6,
        left,
        width,
        maxHeight: height,
        zIndex: dialog ? 10010 : 100,
      });
      setPortalTarget(target);
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [align, filteredOptions.length, isOpen, portal]);

  useEffect(() => {
    if (isOpen) {
      menuRef.current
        ?.querySelector<HTMLElement>('[data-active="true"]')
        ?.scrollIntoView?.({ block: "nearest" });
    }
  }, [isOpen, resolvedIndex]);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) openMenu(event.key === "ArrowUp");
      else if (filteredOptions.length > 0) {
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex(
          (resolvedIndex + direction + filteredOptions.length) % filteredOptions.length,
        );
      }
    } else if (event.key === "Enter" || (!allowCustomValue && event.key === " ")) {
      event.preventDefault();
      if (!isOpen) {
        if (!allowCustomValue) openMenu();
      } else {
        const option = filteredOptions[resolvedIndex];
        if (option) selectOption(option.value);
        else setIsOpen(false);
      }
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
    } else if (event.key === "Tab") {
      setIsOpen(false);
    } else if (!allowCustomValue && isOpen && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : Math.max(0, filteredOptions.length - 1));
    }
  }

  const menu =
    isOpen && !disabled ? (
      <div
        ref={menuRef}
        id={listId}
        role="listbox"
        aria-label={ariaLabel || placeholder}
        style={portal ? (position ?? undefined) : undefined}
        className={cn(
          "z-50 max-h-72 min-w-[160px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/50",
          !portal && "absolute top-full mt-1.5",
          !portal && (align === "right" ? "right-0" : "left-0"),
          menuClassName,
        )}
      >
        {filteredOptions.length === 0 ? (
          <p className="px-3 py-2 text-sm leading-5 text-muted">
            Không có gợi ý phù hợp. Bạn có thể giữ nội dung đã nhập.
          </p>
        ) : (
          filteredOptions.map((option, index) => (
            <div
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              data-active={index === resolvedIndex ? "true" : undefined}
              tabIndex={portal || allowCustomValue ? -1 : 0}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(option.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectOption(option.value);
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }
              }}
              className={cn(
                "focus-ring flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition active:bg-primary-soft",
                option.value === value
                  ? "bg-[#EBF7F2] font-semibold text-primary"
                  : index === resolvedIndex
                    ? "bg-slate-50 text-primary"
                    : "text-heading hover:bg-slate-50 hover:text-primary",
              )}
            >
              <span className="min-w-0 break-words">{option.label}</span>
              {option.value === value ? (
                <Check className="h-4 w-4 shrink-0 text-primary stroke-[2.5]" aria-hidden="true" />
              ) : null}
            </div>
          ))
        )}
      </div>
    ) : null;

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      {allowCustomValue ? (
        <>
          <input
            ref={(element) => {
              triggerRef.current = element;
            }}
            id={selectId}
            type="text"
            role="combobox"
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-autocomplete="list"
            aria-controls={isOpen ? listId : undefined}
            aria-expanded={isOpen}
            aria-activedescendant={isOpen ? activeId : undefined}
            value={value}
            placeholder={placeholder}
            required={required}
            maxLength={maxLength}
            pattern={pattern}
            disabled={disabled}
            onFocus={() => openMenu()}
            onChange={(event) => {
              onChange(event.target.value);
              setQuery(event.target.value);
              setActiveIndex(0);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              "focus-ring w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-10 text-sm text-heading placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50",
              isOpen && "border-primary ring-2 ring-primary ring-offset-0",
              inputClassName,
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            aria-label={isOpen ? "Đóng danh sách gợi ý" : "Mở danh sách gợi ý"}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (isOpen) setIsOpen(false);
              else {
                triggerRef.current?.focus();
                openMenu();
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180 text-primary")}
              aria-hidden="true"
            />
          </button>
        </>
      ) : (
        <button
          ref={(element) => {
            triggerRef.current = element;
          }}
          id={selectId}
          type="button"
          role={portal ? "combobox" : undefined}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listId : undefined}
          aria-expanded={isOpen}
          aria-activedescendant={portal && isOpen ? activeId : undefined}
          aria-required={portal && required ? true : undefined}
          aria-label={ariaLabel || selectedOption?.label || placeholder}
          aria-describedby={ariaDescribedBy}
          onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
          onKeyDown={handleKeyDown}
          className={cn(
            "focus-ring inline-flex items-center justify-between gap-2 rounded-lg border border-[#D8E1ED] bg-white px-3 py-2 text-xs font-semibold text-heading shadow-xs transition hover:border-primary sm:text-sm",
            isOpen && "border-primary ring-2 ring-primary ring-offset-0",
            disabled && "cursor-not-allowed opacity-50",
            buttonClassName,
          )}
        >
          <span className={cn("min-w-0 truncate", !selectedOption && "text-slate-400")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition-transform",
              isOpen && "rotate-180 text-primary",
            )}
            aria-hidden="true"
          />
        </button>
      )}
      {portal ? (portalTarget && position && menu ? createPortal(menu, portalTarget) : null) : menu}
    </div>
  );
}
