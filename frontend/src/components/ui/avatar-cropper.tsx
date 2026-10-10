"use client";

import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { Minus, Move, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

type CropOffset = { x: number; y: number };
type StageSize = { width: number; height: number };
type ImageState =
  | { file: File; status: "loading" }
  | { file: File; status: "ready"; previewUrl: string; width: number; height: number }
  | { file: File; status: "error"; message: string };

type AvatarCropperProps = {
  file: File;
  onCancel: () => void;
  onChooseAnother: () => void;
  onConfirm: (file: File) => void;
  isSubmitting?: boolean;
};

const OUTPUT_SIZE = 512;

export function AvatarCropper({
  file,
  onCancel,
  onChooseAnother,
  onConfirm,
  isSubmitting = false,
}: AvatarCropperProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffset: CropOffset;
  } | null>(null);
  const maskId = `avatar-crop-mask-${useId().replace(/:/g, "")}`;
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [offset, setOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imageState, setImageState] = useState<ImageState | null>(null);
  const [processingError, setProcessingError] = useState<{ file: File; message: string } | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const currentImageState = imageState?.file === file ? imageState : null;
  const loadedImage = currentImageState?.status === "ready" ? currentImageState : null;
  const imageReady = loadedImage !== null;
  const imageError = currentImageState?.status === "error" ? currentImageState.message : "";
  const error = imageError || (processingError?.file === file ? processingError.message : "");
  const cropSize = Math.min(stageSize.height * 0.82, stageSize.width * 0.8, 320);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      imageRef.current = image;
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      setImageState({
        file,
        status: "ready",
        previewUrl: objectUrl,
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () =>
      setImageState({
        file,
        status: "error",
        message: "Không thể mở ảnh này. Vui lòng chọn ảnh khác.",
      });
    image.src = objectUrl;

    return () => {
      image.onload = null;
      image.onerror = null;
      imageRef.current = null;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setStageSize({ width: rect.width, height: rect.height });
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const clampOffset = useCallback(
    (nextOffset: CropOffset, nextZoom = zoom): CropOffset => {
      if (!loadedImage || cropSize <= 0) return { x: 0, y: 0 };

      const imageScale =
        Math.max(cropSize / loadedImage.width, cropSize / loadedImage.height) * nextZoom;
      const maxX = Math.max(0, (loadedImage.width * imageScale - cropSize) / 2);
      const maxY = Math.max(0, (loadedImage.height * imageScale - cropSize) / 2);

      return {
        x: Math.min(maxX, Math.max(-maxX, nextOffset.x)),
        y: Math.min(maxY, Math.max(-maxY, nextOffset.y)),
      };
    },
    [cropSize, loadedImage, zoom],
  );

  const imageScale =
    loadedImage && cropSize > 0
      ? Math.max(cropSize / loadedImage.width, cropSize / loadedImage.height) * zoom
      : 0;
  const imageWidth = loadedImage ? loadedImage.width * imageScale : 0;
  const imageHeight = loadedImage ? loadedImage.height * imageScale : 0;
  const clampedOffset = clampOffset(offset);

  function updateZoom(nextZoom: number) {
    const clampedZoom = Math.min(3, Math.max(1, nextZoom));
    setZoom(clampedZoom);
    setOffset((current) => clampOffset(current, clampedZoom));
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
    const sourceImage = imageRef.current;
    if (!sourceImage || !imageReady || cropSize <= 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) {
      setProcessingError({ file, message: "Chưa thể xử lý ảnh. Vui lòng thử lại." });
      return;
    }

    const outputScale = OUTPUT_SIZE / cropSize;
    const outputImageWidth = sourceImage.naturalWidth * imageScale * outputScale;
    const outputImageHeight = sourceImage.naturalHeight * imageScale * outputScale;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      sourceImage,
      (OUTPUT_SIZE - outputImageWidth) / 2 + clampedOffset.x * outputScale,
      (OUTPUT_SIZE - outputImageHeight) / 2 + clampedOffset.y * outputScale,
      outputImageWidth,
      outputImageHeight,
    );

    canvas.toBlob((blob) => {
      if (!blob) {
        setProcessingError({ file, message: "Chưa thể xử lý ảnh. Vui lòng thử lại." });
        return;
      }
      const fileName = `${file.name.replace(/\.[^.]+$/, "")}-avatar.png`;
      onConfirm(new File([blob], fileName, { type: "image/png", lastModified: Date.now() }));
    }, "image/png");
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-dashed border-slate-200 bg-[#EEF2F6] p-3 sm:p-5">
      <div
        ref={stageRef}
        className={cn(
          "relative aspect-[5/4] w-full touch-none select-none overflow-hidden rounded-xl bg-slate-200 sm:aspect-[3/2]",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="group"
        aria-label="Khung cắt ảnh đại diện hình tròn; kéo ảnh để căn chỉnh"
      >
        {loadedImage && imageWidth > 0 && imageHeight > 0 ? (
          <img
            src={loadedImage.previewUrl}
            alt="Xem trước ảnh đang căn chỉnh"
            draggable={false}
            className="pointer-events-none absolute max-w-none"
            style={{
              width: imageWidth,
              height: imageHeight,
              left: `calc(50% + ${clampedOffset.x}px)`,
              top: `calc(50% + ${clampedOffset.y}px)`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ) : null}

        {stageSize.width > 0 && cropSize > 0 ? (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox={`0 0 ${stageSize.width} ${stageSize.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <mask id={maskId}>
                <rect width={stageSize.width} height={stageSize.height} fill="white" />
                <circle
                  cx={stageSize.width / 2}
                  cy={stageSize.height / 2}
                  r={cropSize / 2}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width={stageSize.width}
              height={stageSize.height}
              fill="rgba(16, 26, 44, 0.48)"
              mask={`url(#${maskId})`}
            />
            <circle
              cx={stageSize.width / 2}
              cy={stageSize.height / 2}
              r={cropSize / 2}
              fill="none"
              stroke="white"
              strokeWidth="3"
            />
          </svg>
        ) : null}

        {!imageReady && !error ? (
          <span className="absolute inset-0 grid place-items-center text-sm text-slate-600">
            Đang tải ảnh...
          </span>
        ) : null}

        {imageReady ? (
          <div className="pointer-events-none absolute left-1/2 top-3 inline-flex -translate-x-1/2 items-center gap-2 rounded-lg bg-slate-950/65 px-3 py-2 text-center text-xs font-medium text-white shadow-sm sm:text-sm">
            <Move className="h-4 w-4 shrink-0" />
            <span>Kéo ảnh để đặt lại vị trí</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3 px-1">
        <button
          type="button"
          aria-label="Thu nhỏ ảnh"
          disabled={!imageReady || zoom <= 1 || isSubmitting}
          onClick={() => updateZoom(zoom - 0.1)}
          className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-heading transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Minus className="h-4 w-4" />
        </button>
        <label className="flex min-w-0 flex-1 items-center gap-3">
          <span className="sr-only">Mức thu phóng ảnh đại diện</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            disabled={!imageReady || isSubmitting}
            onChange={(event) => updateZoom(Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed"
            aria-label="Mức thu phóng ảnh đại diện"
          />
          <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-slate-600">
            {Math.round(zoom * 100)}%
          </span>
        </label>
        <button
          type="button"
          aria-label="Phóng to ảnh"
          disabled={!imageReady || zoom >= 3 || isSubmitting}
          onClick={() => updateZoom(zoom + 0.1)}
          className="focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-heading transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-heading">Căn chỉnh ảnh đại diện</p>
        <p className="text-xs leading-5 text-muted">
          Phần bên ngoài vòng tròn sẽ được cắt khỏi ảnh.
        </p>
      </div>
      {error ? <p className="px-1 text-xs font-medium text-rose-600">{error}</p> : null}

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onChooseAnother}
          disabled={isSubmitting}
          className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Chọn ảnh khác
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="focus-ring inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Hủy
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!imageReady || Boolean(error) || isSubmitting}
          className="focus-ring inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-xs font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Đang tải ảnh..." : "Dùng ảnh này"}
        </button>
      </div>
    </div>
  );
}
