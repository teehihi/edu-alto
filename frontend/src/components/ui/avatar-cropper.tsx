"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

type CropOffset = { x: number; y: number };

type AvatarCropperProps = {
  file: File;
  onCancel: () => void;
  onChooseAnother: () => void;
  onConfirm: (file: File) => void;
};

const OUTPUT_SIZE = 512;

export function AvatarCropper({ file, onCancel, onChooseAnother, onConfirm }: AvatarCropperProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffset: CropOffset;
  } | null>(null);
  const [viewportSize, setViewportSize] = useState(0);
  const [offset, setOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [readyFile, setReadyFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const imageReady = readyFile === file;

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      imageRef.current = image;
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      setReadyFile(file);
      setError("");
    };
    image.onerror = () => setError("Không thể mở ảnh này. Vui lòng chọn ảnh khác.");
    image.src = objectUrl;

    return () => {
      image.onload = null;
      image.onerror = null;
      imageRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver((entries) => {
      const size = entries[0]?.contentRect.width ?? 0;
      setViewportSize(size);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const clampOffset = useCallback(
    (nextOffset: CropOffset, nextZoom = zoom): CropOffset => {
      const image = imageRef.current;
      if (!image || viewportSize <= 0) return { x: 0, y: 0 };

      const fitScale = Math.max(
        viewportSize / image.naturalWidth,
        viewportSize / image.naturalHeight,
      );
      const maxX = Math.max(0, (image.naturalWidth * fitScale * nextZoom - viewportSize) / 2);
      const maxY = Math.max(0, (image.naturalHeight * fitScale * nextZoom - viewportSize) / 2);

      return {
        x: Math.min(maxX, Math.max(-maxX, nextOffset.x)),
        y: Math.min(maxY, Math.max(-maxY, nextOffset.y)),
      };
    },
    [viewportSize, zoom],
  );

  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const image = imageRef.current;
    if (!canvas || !context || !image || !imageReady || viewportSize <= 0) return;

    const fitScale = Math.max(OUTPUT_SIZE / image.naturalWidth, OUTPUT_SIZE / image.naturalHeight);
    const outputScale = OUTPUT_SIZE / viewportSize;
    const renderWidth = image.naturalWidth * fitScale * zoom;
    const renderHeight = image.naturalHeight * fitScale * zoom;
    const clampedOffset = clampOffset(offset);

    context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      (OUTPUT_SIZE - renderWidth) / 2 + clampedOffset.x * outputScale,
      (OUTPUT_SIZE - renderHeight) / 2 + clampedOffset.y * outputScale,
      renderWidth,
      renderHeight,
    );
  }, [clampOffset, imageReady, offset, viewportSize, zoom]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  function updateZoom(value: number) {
    const nextZoom = Math.min(3, Math.max(1, value));
    setZoom(nextZoom);
    setOffset((current) => clampOffset(current, nextZoom));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!imageReady) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: clampOffset(offset),
    };
    setIsDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setOffset(
      clampOffset({
        x: drag.startOffset.x + event.clientX - drag.startX,
        y: drag.startOffset.y + event.clientY - drag.startY,
      }),
    );
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
  }

  function handleConfirm() {
    const canvas = canvasRef.current;
    if (!canvas || !imageReady) return;

    canvas.toBlob((blob) => {
      if (!blob) {
        setError("Chưa thể xử lý ảnh. Vui lòng thử lại.");
        return;
      }
      const fileName = `${file.name.replace(/\.[^.]+$/, "")}-avatar.png`;
      onConfirm(new File([blob], fileName, { type: "image/png", lastModified: Date.now() }));
    }, "image/png");
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-dashed border-slate-200 bg-[#EEF2F6] p-4 sm:p-5">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-8">
        <div
          ref={viewportRef}
          className={cn(
            "relative aspect-square w-56 max-w-full shrink-0 touch-none overflow-hidden rounded-xl border border-white bg-slate-200 shadow-md sm:w-64",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="img"
          aria-label="Khung cắt ảnh đại diện hình vuông; kéo ảnh để căn chỉnh"
        >
          <canvas
            ref={canvasRef}
            width={OUTPUT_SIZE}
            height={OUTPUT_SIZE}
            className="block h-full w-full"
          />
          {!imageReady && !error && (
            <span className="absolute inset-0 grid place-items-center text-sm text-slate-500">
              Đang tải ảnh...
            </span>
          )}
        </div>

        <div className="w-full max-w-sm space-y-3">
          <div>
            <p className="text-sm font-semibold text-heading">Căn chỉnh ảnh đại diện</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Kéo ảnh trong khung vuông để căn chỉnh. Dùng thanh trượt để phóng to hoặc thu nhỏ.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Thu nhỏ ảnh"
              disabled={zoom <= 1 || !imageReady}
              onClick={() => updateZoom(zoom - 0.1)}
              className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-heading transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Minus className="h-4 w-4" />
            </button>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-slate-700">
              <span className="flex items-center justify-between">
                <span>Thu phóng</span>
                <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
              </span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                disabled={!imageReady}
                onChange={(event) => updateZoom(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
                aria-label="Mức thu phóng ảnh đại diện"
              />
            </label>
            <button
              type="button"
              aria-label="Phóng to ảnh"
              disabled={zoom >= 3 || !imageReady}
              onClick={() => updateZoom(zoom + 0.1)}
              className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-heading transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onChooseAnother}
          className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Chọn ảnh khác
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!imageReady || Boolean(error)}
          className="focus-ring inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          Dùng ảnh này
        </button>
      </div>
    </div>
  );
}
