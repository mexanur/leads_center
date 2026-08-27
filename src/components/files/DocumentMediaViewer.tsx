"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Crop,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Sun,
  Layers,
  Sparkles,
  Check,
  Undo2,
  RefreshCw,
  Eye,
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

export function DocumentMediaViewer({
  isOpen,
  files,
  initialIndex = 0,
  driverName = "Driver Lead",
  onClose,
}: DocumentMediaViewerProps) {
  // Only image files or all files that can be rendered
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

  // Crop states
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropRect, setCropRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [appliedCrop, setAppliedCrop] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [cropAspectRatio, setCropAspectRatio] = useState<number | null>(null); // null = freeform, 3/2 = ID Card

  // Image loading & rendering state
  const [loadedImg, setLoadedImg] = useState<HTMLImageElement | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [isExportingMerged, setIsExportingMerged] = useState(false);
  const [mergedProgress, setMergedProgress] = useState("");

  // Panning & dragging references
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, imageFiles.length - 1)));
      resetTransformations();
    }
  }, [isOpen, initialIndex, imageFiles.length]);

  // Reset transforms whenever changing file
  const resetTransformations = () => {
    setRotation(0);
    setFlipH(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFilter("original");
    setIsCropMode(false);
    setCropRect(null);
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

  // Live Canvas Rendering whenever transforms, filters, or crops change
  useEffect(() => {
    if (!loadedImg || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const processed = renderProcessedCanvas(loadedImg, {
      rotation,
      flipH,
      crop: appliedCrop || undefined,
      filter,
    });

    canvas.width = processed.width;
    canvas.height = processed.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(processed, 0, 0);
    }
  }, [loadedImg, rotation, flipH, appliedCrop, filter]);

  // Pan & Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCropMode) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isCropMode) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Scroll Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom((prev) => Math.max(0.25, Math.min(5, prev * zoomFactor)));
  };

  // Keyboard navigation & controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, imageFiles.length]);

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

  // Initialize Crop Box
  const handleStartCrop = () => {
    if (!loadedImg) return;
    setIsCropMode(true);
    const naturalW = loadedImg.naturalWidth;
    const naturalH = loadedImg.naturalHeight;

    // Start with centered 80% box
    const width = Math.round(naturalW * 0.8);
    const height = cropAspectRatio
      ? Math.round(width / cropAspectRatio)
      : Math.round(naturalH * 0.8);
    const x = Math.round((naturalW - width) / 2);
    const y = Math.round((naturalH - height) / 2);

    setCropRect({ x, y, width, height });
  };

  const handleApplyCrop = () => {
    if (cropRect) {
      setAppliedCrop(cropRect);
      setIsCropMode(false);
      toast.success("Crop applied to view");
    }
  };

  const handleCancelCrop = () => {
    setIsCropMode(false);
    setCropRect(null);
  };

  const handleResetCrop = () => {
    setAppliedCrop(null);
    setCropRect(null);
    setIsCropMode(false);
    toast.success("Crop reset to original size");
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
              disabled={currentIndex === 0}
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
              disabled={currentIndex === imageFiles.length - 1}
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

        {/* Right: Quick Zoom, Fullscreen & Close */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs font-mono">
            <span>{Math.round(zoom * 100)}%</span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Close Viewer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-4 ${
          isDragging ? "cursor-grabbing" : isCropMode ? "cursor-crosshair" : "cursor-grab"
        }`}
      >
        {isLoadingImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-zinc-950/40 z-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-zinc-400">Loading document...</p>
          </div>
        )}

        {/* Interactive Rendering Canvas */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
          className="relative max-w-full max-h-full flex items-center justify-center shadow-2xl origin-center"
        >
          <canvas
            ref={canvasRef}
            className="max-w-[85vw] max-h-[75vh] object-contain rounded-lg border border-zinc-800 shadow-2xl bg-zinc-900"
          />

          {/* Interactive Cropper Overlay */}
          {isCropMode && loadedImg && (
            <div className="absolute inset-0 border-2 border-blue-500 bg-blue-500/10 pointer-events-none rounded-lg ring-2 ring-blue-500/40">
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-blue-600 text-[10px] font-bold text-white shadow-xs">
                Crop Area: {cropAspectRatio ? "Card 3:2" : "Free"}
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

          {/* Crop Mode Controls */}
          {!isCropMode ? (
            <button
              onClick={handleStartCrop}
              className={`p-1.5 px-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                appliedCrop
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "hover:bg-zinc-700 text-zinc-300 hover:text-white"
              }`}
              title="Crop Image"
            >
              <Crop className="w-3.5 h-3.5" />
              <span>{appliedCrop ? "Recrop" : "Crop"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCropAspectRatio(cropAspectRatio ? null : 3 / 2)}
                className={`px-2 py-1 rounded text-[11px] font-bold ${
                  cropAspectRatio ? "bg-blue-600 text-white" : "bg-zinc-700 text-zinc-300"
                }`}
                title="Toggle Card 3:2 Aspect Ratio"
              >
                {cropAspectRatio ? "Card 3:2" : "Free"}
              </button>
              <button
                onClick={handleApplyCrop}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Apply
              </button>
              <button
                onClick={handleCancelCrop}
                className="px-2 py-1 rounded hover:bg-zinc-700 text-zinc-400 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {appliedCrop && !isCropMode && (
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
      </div>
    </div>
  );
}
