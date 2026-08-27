"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Crop,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sun,
  Undo2,
  Check,
  Move,
  FileDown,
} from "lucide-react";
import { LeadFile } from "@/types";
import {
  ImageFilterType,
  loadHtmlImage,
  renderProcessedCanvas,
  downloadCanvasImage,
  exportCanvasAsPdf,
  exportMergedDriverFilesAsPdf,
} from "@/lib/pdf-export";
import { toast } from "sonner";

interface DocumentMediaViewerProps {
  isOpen: boolean;
  files: LeadFile[];
  initialIndex?: number;
  driverName?: string;
  onClose: () => void;
}

type DragHandleType =
  | "move"
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | "n"
  | "s"
  | "e"
  | "w";

interface CropPercent {
  x: number; // 0 to 100%
  y: number; // 0 to 100%
  width: number; // 0 to 100%
  height: number; // 0 to 100%
}

export function DocumentMediaViewer({
  isOpen,
  files,
  initialIndex = 0,
  driverName = "Driver Lead",
  onClose,
}: DocumentMediaViewerProps) {
  const imageFiles = files.filter(
    (f) =>
      f.mimeType?.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|heic|bmp)$/i.test(f.name)
  );

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentFile = imageFiles[currentIndex] || files[currentIndex];

  // Transformation states
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [filter, setFilter] = useState<ImageFilterType>("original");

  // Advanced Interactive Cropper States
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropBox, setCropBox] = useState<CropPercent>({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [appliedCrop, setAppliedCrop] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [cropAspectPreset, setCropAspectPreset] = useState<string>("free"); // free, 3:2, 4:3, 16:9, 1:1

  // Image loading & rendering state
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [isExportingMerged, setIsExportingMerged] = useState(false);
  const [mergedProgress, setMergedProgress] = useState("");

  // Panning & dragging references
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const workspaceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  // Active handle dragging reference
  const activeCropDragRef = useRef<{
    handle: DragHandleType;
    startX: number;
    startY: number;
    initialBox: CropPercent;
    containerWidth: number;
    containerHeight: number;
    aspectRatio: number | null;
  } | null>(null);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, imageFiles.length - 1)));
      resetTransformations();
    }
  }, [isOpen, initialIndex, imageFiles.length]);

  const resetTransformations = () => {
    setRotation(0);
    setFlipH(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFilter("original");
    setIsCropMode(false);
    setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    setAppliedCrop(null);
  };

  // Load the current image
  useEffect(() => {
    if (!isOpen || !currentFile) return;

    let isMounted = true;
    setIsLoadingImage(true);

    loadHtmlImage(currentFile.fileUrl)
      .then((img) => {
        if (isMounted) {
          setLoadedImg(img);
          setIsLoadingImage(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load image for viewer:", err);
        if (isMounted) {
          setIsLoadingImage(false);
          toast.error("Failed to load full image preview");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentFile]);

  // Live Canvas Rendering
  useEffect(() => {
    if (!loadedImg || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const processed = renderProcessedCanvas(loadedImg, {
      rotation,
      flipH,
      crop: isCropMode ? undefined : appliedCrop || undefined,
      filter,
    });

    canvas.width = processed.width;
    canvas.height = processed.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(processed, 0, 0);
    }
  }, [loadedImg, rotation, flipH, appliedCrop, filter, isCropMode]);

  // Pan & Drag Handlers when not cropping
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCropMode) return;
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || isCropMode) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setPan({
      x: panStartRef.current.panX + dx,
      y: panStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Scroll Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (isCropMode) return;
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom((prev) => Math.max(0.25, Math.min(5, prev * zoomFactor)));
  };

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isCropMode) {
          setIsCropMode(false);
        } else {
          onClose();
        }
      } else if (!isCropMode) {
        if (e.key === "ArrowLeft") {
          navigateFile(-1);
        } else if (e.key === "ArrowRight") {
          navigateFile(1);
        } else if (e.key === "+" || e.key === "=") {
          setZoom((z) => Math.min(5, z + 0.25));
        } else if (e.key === "-") {
          setZoom((z) => Math.max(0.25, z - 0.25));
        } else if (e.key === "0") {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        } else if (e.key === "r" || e.key === "R") {
          setRotation((r) => (r + 90) % 360);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, imageFiles.length, isCropMode]);

  const navigateFile = (dir: number) => {
    const nextIdx = currentIndex + dir;
    if (nextIdx >= 0 && nextIdx < imageFiles.length) {
      setCurrentIndex(nextIdx);
      resetTransformations();
    }
  };

  // Rotation controls
  const handleRotateCW = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateCCW = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleFlipH = () => setFlipH((prev) => !prev);

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // ==========================================
  // ADVANCED INTERACTIVE CROPPER ENGINE
  // ==========================================
  const handleStartCrop = () => {
    if (!loadedImg) return;
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsCropMode(true);
    setCropAspectPreset("free");

    if (appliedCrop && loadedImg) {
      const naturalW = (rotation === 90 || rotation === 270) ? loadedImg.naturalHeight : loadedImg.naturalWidth;
      const naturalH = (rotation === 90 || rotation === 270) ? loadedImg.naturalWidth : loadedImg.naturalHeight;
      setCropBox({
        x: Math.max(0, (appliedCrop.x / naturalW) * 100),
        y: Math.max(0, (appliedCrop.y / naturalH) * 100),
        width: Math.min(100, (appliedCrop.width / naturalW) * 100),
        height: Math.min(100, (appliedCrop.height / naturalH) * 100),
      });
    } else {
      setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    }
  };

  const applyCropPreset = (preset: string) => {
    setCropAspectPreset(preset);
    let ratio: number | null = null;
    if (preset === "3:2") ratio = 3 / 2;
    else if (preset === "4:3") ratio = 4 / 3;
    else if (preset === "16:9") ratio = 16 / 9;
    else if (preset === "1:1") ratio = 1;

    if (ratio && cropContainerRef.current) {
      const rect = cropContainerRef.current.getBoundingClientRect();
      const containerRatio = rect.width / rect.height;

      let w = 80;
      let h = (w * containerRatio) / ratio;

      if (h > 90) {
        h = 80;
        w = (h * ratio) / containerRatio;
      }

      const x = (100 - w) / 2;
      const y = (100 - h) / 2;

      setCropBox({
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: Math.min(100, w),
        height: Math.min(100, h),
      });
    }
  };

  const handleCropHandlePointerDown = (
    e: React.PointerEvent,
    handle: DragHandleType
  ) => {
    e.stopPropagation();
    e.preventDefault();

    if (!cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();

    let ratio: number | null = null;
    if (cropAspectPreset === "3:2") ratio = 3 / 2;
    else if (cropAspectPreset === "4:3") ratio = 4 / 3;
    else if (cropAspectPreset === "16:9") ratio = 16 / 9;
    else if (cropAspectPreset === "1:1") ratio = 1;

    activeCropDragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialBox: { ...cropBox },
      containerWidth: rect.width,
      containerHeight: rect.height,
      aspectRatio: ratio,
    };

    window.addEventListener("pointermove", handleCropPointerMove);
    window.addEventListener("pointerup", handleCropPointerUp);
  };

  const handleCropPointerMove = useCallback((e: PointerEvent) => {
    if (!activeCropDragRef.current) return;

    const {
      handle,
      startX,
      startY,
      initialBox,
      containerWidth,
      containerHeight,
    } = activeCropDragRef.current;

    const deltaXPct = ((e.clientX - startX) / containerWidth) * 100;
    const deltaYPct = ((e.clientY - startY) / containerHeight) * 100;

    setCropBox((prev) => {
      let next = { ...initialBox };

      if (handle === "move") {
        let nextX = initialBox.x + deltaXPct;
        let nextY = initialBox.y + deltaYPct;

        nextX = Math.max(0, Math.min(100 - initialBox.width, nextX));
        nextY = Math.max(0, Math.min(100 - initialBox.height, nextY));

        return { ...initialBox, x: nextX, y: nextY };
      }

      const minSize = 5; // Minimum 5% width/height

      // Resize Edges & Corners
      if (handle === "se" || handle === "e" || handle === "s") {
        if (handle === "se" || handle === "e") {
          next.width = Math.max(minSize, Math.min(100 - initialBox.x, initialBox.width + deltaXPct));
        }
        if (handle === "se" || handle === "s") {
          next.height = Math.max(minSize, Math.min(100 - initialBox.y, initialBox.height + deltaYPct));
        }
      }

      if (handle === "nw" || handle === "w" || handle === "n") {
        if (handle === "nw" || handle === "w") {
          const maxLeft = initialBox.x + initialBox.width - minSize;
          const targetX = Math.max(0, Math.min(maxLeft, initialBox.x + deltaXPct));
          next.width = initialBox.width + (initialBox.x - targetX);
          next.x = targetX;
        }
        if (handle === "nw" || handle === "n") {
          const maxTop = initialBox.y + initialBox.height - minSize;
          const targetY = Math.max(0, Math.min(maxTop, initialBox.y + deltaYPct));
          next.height = initialBox.height + (initialBox.y - targetY);
          next.y = targetY;
        }
      }

      if (handle === "ne") {
        next.width = Math.max(minSize, Math.min(100 - initialBox.x, initialBox.width + deltaXPct));
        const maxTop = initialBox.y + initialBox.height - minSize;
        const targetY = Math.max(0, Math.min(maxTop, initialBox.y + deltaYPct));
        next.height = initialBox.height + (initialBox.y - targetY);
        next.y = targetY;
      }

      if (handle === "sw") {
        const maxLeft = initialBox.x + initialBox.width - minSize;
        const targetX = Math.max(0, Math.min(maxLeft, initialBox.x + deltaXPct));
        next.width = initialBox.width + (initialBox.x - targetX);
        next.x = targetX;
        next.height = Math.max(minSize, Math.min(100 - initialBox.y, initialBox.height + deltaYPct));
      }

      return next;
    });
  }, []);

  const handleCropPointerUp = useCallback(() => {
    activeCropDragRef.current = null;
    window.removeEventListener("pointermove", handleCropPointerMove);
    window.removeEventListener("pointerup", handleCropPointerUp);
  }, [handleCropPointerMove]);

  const handleApplyCrop = () => {
    if (!loadedImg) return;

    const isRotated90or270 = rotation === 90 || rotation === 270;
    const baseW = isRotated90or270 ? loadedImg.naturalHeight : loadedImg.naturalWidth;
    const baseH = isRotated90or270 ? loadedImg.naturalWidth : loadedImg.naturalHeight;

    const pixelCrop = {
      x: Math.round((cropBox.x / 100) * baseW),
      y: Math.round((cropBox.y / 100) * baseH),
      width: Math.round((cropBox.width / 100) * baseW),
      height: Math.round((cropBox.height / 100) * baseH),
    };

    setAppliedCrop(pixelCrop);
    setIsCropMode(false);
    toast.success("Crop applied to document");
  };

  const handleCancelCrop = () => {
    setIsCropMode(false);
  };

  const handleResetCrop = () => {
    setAppliedCrop(null);
    setCropBox({ x: 10, y: 10, width: 80, height: 80 });
    setIsCropMode(false);
    toast.success("Crop reset to full original image");
  };

  // Downloads & Exports
  const handleDownloadImage = () => {
    if (!canvasRef.current || !currentFile) return;
    const safeName = currentFile.name.replace(/\.[^/.]+$/, "");
    const suffix = filter === "bw_scanner" ? "_BW" : filter === "grayscale" ? "_Gray" : "_Edited";
    downloadCanvasImage(canvasRef.current, `${safeName}${suffix}.png`);
    toast.success("Downloaded processed image");
  };

  const handleDownloadSinglePdf = () => {
    if (!canvasRef.current || !currentFile) return;
    const safeName = currentFile.name.replace(/\.[^/.]+$/, "");
    const suffix = filter === "bw_scanner" ? "_BW" : "";
    exportCanvasAsPdf(canvasRef.current, `${safeName}${suffix}.pdf`, {
      driverName,
      title: currentFile.fileType.replace("_", " "),
    });
    toast.success("Downloaded document as PDF");
  };

  const handleExportMergedPdf = async (selectedFilter: ImageFilterType) => {
    if (imageFiles.length === 0) {
      toast.error("No image documents available to merge");
      return;
    }

    try {
      setIsExportingMerged(true);
      setMergedProgress("Preparing document frames...");

      await exportMergedDriverFilesAsPdf(imageFiles, {
        driverName,
        filter: selectedFilter,
        onProgress: (current, total, name) => {
          setMergedProgress(`Processing ${current} of ${total}: ${name}`);
        },
      });

      toast.success(
        `Exported ${imageFiles.length} pages into merged PDF (${
          selectedFilter === "bw_scanner" ? "Black & White" : "Original"
        })`
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate merged PDF");
    } finally {
      setIsExportingMerged(false);
      setMergedProgress("");
    }
  };

  if (!isOpen || !currentFile) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-md text-white select-none animate-in fade-in duration-150">
      {/* Top Header Bar */}
      <div className="h-14 px-4 sm:px-6 border-b border-zinc-800/80 bg-zinc-900/80 flex items-center justify-between shrink-0">
        {/* Left: Document Info & Pagination */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => navigateFile(-1)}
              disabled={currentIndex === 0 || isCropMode}
              className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
              title="Previous Document (Left Arrow)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-mono font-bold text-zinc-400">
              {currentIndex + 1} / {imageFiles.length}
            </span>
            <button
              onClick={() => navigateFile(1)}
              disabled={currentIndex === imageFiles.length - 1 || isCropMode}
              className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer"
              title="Next Document (Right Arrow)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-800 shrink-0" />

          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-zinc-100 truncate">
              {currentFile.name}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span className="font-semibold text-blue-400">
                {currentFile.fileType.replace("_", " ")}
              </span>
              <span>•</span>
              <span>{(currentFile.fileSize / 1024 / 1024).toFixed(2)} MB</span>
              {appliedCrop && (
                <>
                  <span>•</span>
                  <span className="text-amber-400 font-semibold">Cropped</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Zoom, Presets & Close */}
        <div className="flex items-center gap-2 shrink-0">
          {!isCropMode && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs font-mono">
              <span>{Math.round(zoom * 100)}%</span>
            </div>
          )}

          <button
            onClick={() => {
              if (isCropMode) setIsCropMode(false);
              else onClose();
            }}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Close Viewer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Canvas / Cropper Workspace */}
      <div
        ref={workspaceRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-4 ${
          isPanning ? "cursor-grabbing" : isCropMode ? "cursor-default" : "cursor-grab"
        }`}
      >
        {isLoadingImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-zinc-950/40 z-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-400">Loading document...</p>
          </div>
        )}

        {/* Canvas / Image Container */}
        <div
          ref={cropContainerRef}
          style={{
            transform: isCropMode
              ? "none"
              : `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isPanning || isCropMode ? "none" : "transform 0.1s ease-out",
          }}
          className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl origin-center"
        >
          <canvas
            ref={canvasRef}
            className="max-w-[85vw] max-h-[75vh] object-contain rounded-lg border border-zinc-800 shadow-2xl bg-zinc-900 block"
          />

          {/* ========================================================= */}
          {/* PROFESSIONAL MULTI-HANDLE INTERACTIVE CROPPER OVERLAY     */}
          {/* ========================================================= */}
          {isCropMode && (
            <div className="absolute inset-0 z-30 pointer-events-auto select-none">
              {/* Darkened Outer Shaded Mask (4 Sides) */}
              {/* Top Mask */}
              <div
                style={{ top: 0, left: 0, right: 0, height: `${cropBox.y}%` }}
                className="absolute bg-black/60 backdrop-blur-[1px]"
              />
              {/* Bottom Mask */}
              <div
                style={{
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${100 - (cropBox.y + cropBox.height)}%`,
                }}
                className="absolute bg-black/60 backdrop-blur-[1px]"
              />
              {/* Left Mask */}
              <div
                style={{
                  top: `${cropBox.y}%`,
                  left: 0,
                  width: `${cropBox.x}%`,
                  height: `${cropBox.height}%`,
                }}
                className="absolute bg-black/60 backdrop-blur-[1px]"
              />
              {/* Right Mask */}
              <div
                style={{
                  top: `${cropBox.y}%`,
                  right: 0,
                  width: `${100 - (cropBox.x + cropBox.width)}%`,
                  height: `${cropBox.height}%`,
                }}
                className="absolute bg-black/60 backdrop-blur-[1px]"
              />

              {/* ACTIVE CROP BOX */}
              <div
                style={{
                  left: `${cropBox.x}%`,
                  top: `${cropBox.y}%`,
                  width: `${cropBox.width}%`,
                  height: `${cropBox.height}%`,
                }}
                onPointerDown={(e) => handleCropHandlePointerDown(e, "move")}
                className="absolute border-2 border-white shadow-2xl ring-1 ring-blue-500/60 cursor-move"
              >
                {/* 3x3 Rule-of-Thirds Grid Guidelines */}
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 pointer-events-none">
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div />
                </div>

                {/* Center Move Indicator Badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 hover:opacity-100 transition-opacity">
                  <div className="p-1 rounded-full bg-black/50 text-white">
                    <Move className="w-4 h-4" />
                  </div>
                </div>

                {/* ================= CORNER HANDLES ================= */}
                {/* NW Top-Left */}
                <div
                  onPointerDown={(e) => handleCropHandlePointerDown(e, "nw")}
                  className="absolute -top-2.5 -left-2.5 w-6 h-6 flex items-start justify-start cursor-nwse-resize z-40 p-0.5"
                  title="Drag to resize top-left"
                >
                  <div className="w-4 h-4 border-t-3 border-l-3 border-blue-500 bg-white rounded-tl-sm shadow-md" />
                </div>

                {/* NE Top-Right */}
                <div
                  onPointerDown={(e) => handleCropHandlePointerDown(e, "ne")}
                  className="absolute -top-2.5 -right-2.5 w-6 h-6 flex items-start justify-end cursor-nesw-resize z-40 p-0.5"
                  title="Drag to resize top-right"
                >
                  <div className="w-4 h-4 border-t-3 border-r-3 border-blue-500 bg-white rounded-tr-sm shadow-md" />
                </div>

                {/* SW Bottom-Left */}
                <div
                  onPointerDown={(e) => handleCropHandlePointerDown(e, "sw")}
                  className="absolute -bottom-2.5 -left-2.5 w-6 h-6 flex items-end justify-start cursor-nesw-resize z-40 p-0.5"
                  title="Drag to resize bottom-left"
                >
                  <div className="w-4 h-4 border-b-3 border-l-3 border-blue-500 bg-white rounded-bl-sm shadow-md" />
                </div>

                {/* SE Bottom-Right */}
                <div
                  onPointerDown={(e) => handleCropHandlePointerDown(e, "se")}
                  className="absolute -bottom-2.5 -right-2.5 w-6 h-6 flex items-end justify-end cursor-nwse-resize z-40 p-0.5"
                  title="Drag to resize bottom-right"
                >
                  <div className="w-4 h-4 border-b-3 border-r-3 border-blue-500 bg-white rounded-br-sm shadow-md" />
                </div>

                {/* ================= EDGE HANDLES ================= */}
                {/* N Top Edge */}
                <div
                  onPointerDown={(e) => handleCropHandlePointerDown(e, "n")}
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-4 flex items-center justify-center cursor-ns-resize z-40"
                  title="Drag top edge"
                >
                  <div className="w-6 h-1.5 bg-white border border-blue-500 rounded-full shadow-xs" />
                </div>

                {/* S Bottom Edge */}
                <div
                  onPointerDown={(e) => handleCropHandlePointerDown(e, "s")}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-4 flex items-center justify-center cursor-ns-resize z-40"
                  title="Drag bottom edge"
                >
                  <div className="w-6 h-1.5 bg-white border border-blue-500 rounded-full shadow-xs" />
                </div>

                {/* W Left Edge */}
                <div
                  onPointerDown={(e) => handleCropHandlePointerDown(e, "w")}
                  className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-10 flex items-center justify-center cursor-ew-resize z-40"
                  title="Drag left edge"
                >
                  <div className="w-1.5 h-6 bg-white border border-blue-500 rounded-full shadow-xs" />
                </div>

                {/* E Right Edge */}
                <div
                  onPointerDown={(e) => handleCropHandlePointerDown(e, "e")}
                  className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-10 flex items-center justify-center cursor-ew-resize z-40"
                  title="Drag right edge"
                >
                  <div className="w-1.5 h-6 bg-white border border-blue-500 rounded-full shadow-xs" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Merged PDF Progress Banner */}
        {isExportingMerged && (
          <div className="absolute top-6 px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700 shadow-2xl flex items-center gap-3 z-30 animate-in slide-in-from-top-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-zinc-200">{mergedProgress}</span>
          </div>
        )}
      </div>

      {/* Bottom Control Studio Toolbar */}
      <div className="px-4 py-3 border-t border-zinc-800/80 bg-zinc-900/90 shrink-0 flex flex-wrap items-center justify-between gap-3">
        {/* If Crop Mode is Active: Show Specialized Crop Controls */}
        {isCropMode ? (
          <div className="w-full flex items-center justify-between gap-3 flex-wrap animate-in fade-in">
            {/* Aspect Ratio Presets */}
            <div className="flex items-center gap-1.5 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700/60">
              <span className="text-[11px] font-bold text-zinc-400 px-2">Aspect:</span>
              {[
                { id: "free", label: "Freeform" },
                { id: "3:2", label: "Card (3:2)" },
                { id: "4:3", label: "4:3" },
                { id: "16:9", label: "16:9" },
                { id: "1:1", label: "1:1 Square" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyCropPreset(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    cropAspectPreset === p.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Apply / Cancel Crop Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelCrop}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold border border-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCrop}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply Crop</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Section 1: Visual Filters (Original, Scanner B&W, Grayscale, Enhanced) */}
            <div className="flex items-center gap-1.5 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700/60 overflow-x-auto custom-scrollbar">
              <button
                onClick={() => setFilter("original")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === "original"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setFilter("bw_scanner")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  filter === "bw_scanner"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="High contrast document binarization for clean text"
              >
                <Sun className="w-3 h-3" />
                <span>B&W Scanner</span>
              </button>
              <button
                onClick={() => setFilter("grayscale")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === "grayscale"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Grayscale
              </button>
              <button
                onClick={() => setFilter("enhanced")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === "enhanced"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                High Contrast
              </button>
            </div>

            {/* Section 2: Transformation Tools (Rotate, Flip, Zoom, Crop) */}
            <div className="flex items-center gap-1 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700/60">
              <button
                onClick={handleRotateCCW}
                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Rotate 90° Counter-Clockwise"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleRotateCW}
                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Rotate 90° Clockwise (R)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleFlipH}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  flipH ? "bg-blue-600 text-white" : "hover:bg-zinc-700 text-zinc-300 hover:text-white"
                }`}
                title="Flip Horizontally"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-zinc-700 mx-0.5" />

              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetView}
                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer text-xs font-semibold px-2"
                title="Reset Zoom & Pan (0)"
              >
                Reset
              </button>

              <div className="h-4 w-px bg-zinc-700 mx-0.5" />

              {/* Crop Mode Button */}
              <button
                onClick={handleStartCrop}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  appliedCrop
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/40"
                }`}
                title="Interactive Edge & Corner Cropping"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>{appliedCrop ? "Recrop" : "Crop Image"}</span>
              </button>

              {appliedCrop && (
                <button
                  onClick={handleResetCrop}
                  className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors"
                  title="Remove Crop"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Section 3: Export & PDF Downloads */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Download Processed Image */}
              <button
                onClick={handleDownloadImage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700/80 transition-colors cursor-pointer"
                title="Download PNG with current transformations"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Image</span>
              </button>

              {/* Download Single as PDF */}
              <button
                onClick={handleDownloadSinglePdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700/80 transition-colors cursor-pointer"
                title="Download this document as a PDF"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>PDF (Single)</span>
              </button>

              {/* Merged PDF Dropdown */}
              <div className="flex items-center gap-1 bg-blue-600/20 border border-blue-500/40 p-0.5 rounded-xl">
                <button
                  onClick={() => handleExportMergedPdf("original")}
                  disabled={isExportingMerged}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-300 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  title="Download all attached driver documents as a multi-page PDF in original colors"
                >
                  Merge PDF (Original)
                </button>
                <button
                  onClick={() => handleExportMergedPdf("bw_scanner")}
                  disabled={isExportingMerged}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-blue-300 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  title="Download all attached driver documents as a high-contrast Black & White multi-page PDF"
                >
                  Merge PDF (B&W)
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
