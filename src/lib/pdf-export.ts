import { jsPDF } from "jspdf";
import { LeadFile } from "@/types";

export type ImageFilterType = "original" | "bw_scanner" | "grayscale" | "enhanced";

export interface CropRect {
  x: number; // percentage 0-100 or pixel
  y: number;
  width: number;
  height: number;
}

/**
 * Loads an image from a URL, using proxy if needed to avoid CORS taint
 */
export async function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback to proxy endpoint if direct CORS failed
      const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&name=image.jpg`;
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = "anonymous";
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = (e) => reject(e);
      fallbackImg.src = proxyUrl;
    };

    img.src = url;
  });
}

/**
 * Applies document scanner or color filter to 2D Canvas context
 */
export function applyFilterToContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filterType: ImageFilterType
) {
  if (filterType === "original") return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const len = data.length;

  if (filterType === "grayscale") {
    for (let i = 0; i < len; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  } else if (filterType === "enhanced") {
    // Boost contrast & sharpen midtones
    const factor = 1.35; // Contrast factor
    for (let i = 0; i < len; i += 4) {
      for (let j = 0; j < 3; j++) {
        let v = data[i + j];
        v = (v - 128) * factor + 128;
        data[i + j] = Math.max(0, Math.min(255, v));
      }
    }
  } else if (filterType === "bw_scanner") {
    // Document Scanner: High-contrast adaptive threshold binarization
    // 1. Calculate average luminance
    let totalLuminance = 0;
    for (let i = 0; i < len; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      totalLuminance += gray;
    }
    const avgLuminance = totalLuminance / (len / 4);
    // Adaptive threshold slightly below average to keep dark text crisp
    const threshold = Math.max(100, Math.min(160, avgLuminance * 0.92));

    for (let i = 0; i < len; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const val = gray < threshold ? 0 : 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Renders an image with rotation, fine tilt angle, flip, crop, and filters onto an offscreen canvas
 */
export function renderProcessedCanvas(
  img: HTMLImageElement,
  options: {
    rotation?: number; // 0, 90, 180, 270
    tiltAngle?: number; // -45 to +45 degrees fine tilt/straighten
    flipH?: boolean;
    crop?: { x: number; y: number; width: number; height: number }; // In post-rotation coordinates
    filter?: ImageFilterType;
  }
): HTMLCanvasElement {
  const rotation = options.rotation || 0;
  const tiltAngle = options.tiltAngle || 0;
  const totalAngle = ((rotation + tiltAngle) % 360 + 360) % 360;
  const flipH = options.flipH || false;
  const filter = options.filter || "original";

  const rad = (totalAngle * Math.PI) / 180;
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  // Calculate rotated bounding box dimensions
  const rotW = Math.abs(origW * Math.cos(rad)) + Math.abs(origH * Math.sin(rad));
  const rotH = Math.abs(origW * Math.sin(rad)) + Math.abs(origH * Math.cos(rad));

  // Step 1: Draw full rotated image onto intermediate canvas
  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = Math.max(1, Math.round(rotW));
  rotCanvas.height = Math.max(1, Math.round(rotH));
  const rotCtx = rotCanvas.getContext("2d");

  if (rotCtx) {
    rotCtx.save();
    rotCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
    rotCtx.rotate(rad);
    if (flipH) rotCtx.scale(-1, 1);
    rotCtx.drawImage(img, -origW / 2, -origH / 2, origW, origH);
    rotCtx.restore();
  }

  // Step 2: Handle Crop (if specified) or use the rotated canvas
  const crop = options.crop;
  if (!crop) {
    if (rotCtx) {
      applyFilterToContext(rotCtx, rotCanvas.width, rotCanvas.height, filter);
    }
    return rotCanvas;
  }

  // Output cropped canvas
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = Math.max(1, Math.round(crop.width));
  cropCanvas.height = Math.max(1, Math.round(crop.height));
  const cropCtx = cropCanvas.getContext("2d");

  if (cropCtx) {
    cropCtx.drawImage(
      rotCanvas,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );
    applyFilterToContext(cropCtx, cropCanvas.width, cropCanvas.height, filter);
  }

  return cropCanvas;
}

/**
 * Downloads a canvas as a PNG/JPEG image
 */
export function downloadCanvasImage(
  canvas: HTMLCanvasElement,
  filename: string,
  type: "image/png" | "image/jpeg" = "image/png"
) {
  const link = document.createElement("a");
  link.download = filename.endsWith(".png") || filename.endsWith(".jpg") ? filename : `${filename}.png`;
  link.href = canvas.toDataURL(type, 0.95);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Exports a single processed canvas as a standard printable PDF document
 */
export function exportCanvasAsPdf(
  canvas: HTMLCanvasElement,
  filename: string,
  options?: {
    title?: string;
    driverName?: string;
  }
) {
  const isLandscape = canvas.width > canvas.height;
  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10; // 10mm margins

  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - margin * 2;

  // Calculate proportional fit
  const imgRatio = canvas.width / canvas.height;
  const pageRatio = maxW / maxH;

  let renderW = maxW;
  let renderH = maxH;

  if (imgRatio > pageRatio) {
    renderW = maxW;
    renderH = maxW / imgRatio;
  } else {
    renderH = maxH;
    renderW = maxH * imgRatio;
  }

  const posX = margin + (maxW - renderW) / 2;
  const posY = margin + (maxH - renderH) / 2;

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  pdf.addImage(imgData, "JPEG", posX, posY, renderW, renderH, undefined, "FAST");

  // Optional subtle header
  if (options?.driverName || options?.title) {
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    const headerText = [options.driverName, options.title].filter(Boolean).join(" - ");
    pdf.text(headerText, margin, 7);
  }

  const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  pdf.save(cleanFilename);
}

/**
 * Merges multiple driver image files into a single multi-page PDF packet
 */
export async function exportMergedDriverFilesAsPdf(
  files: LeadFile[],
  options: {
    driverName: string;
    filter?: ImageFilterType;
    onProgress?: (current: number, total: number, fileName: string) => void;
  }
): Promise<void> {
  const imageFiles = files.filter((f) => {
    return (
      f.mimeType?.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|heic|bmp)$/i.test(f.name)
    );
  });

  if (imageFiles.length === 0) {
    throw new Error("No image documents found to export into PDF.");
  }

  let pdf: jsPDF | null = null;
  const filter = options.filter || "original";

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    if (options.onProgress) {
      options.onProgress(i + 1, imageFiles.length, file.name);
    }

    const img = await loadHtmlImage(file.fileUrl);
    const canvas = renderProcessedCanvas(img, { filter });

    const isLandscape = canvas.width > canvas.height;

    if (!pdf) {
      pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });
    } else {
      pdf.addPage("a4", isLandscape ? "landscape" : "portrait");
    }

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;

    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;

    const imgRatio = canvas.width / canvas.height;
    const pageRatio = maxW / maxH;

    let renderW = maxW;
    let renderH = maxH;

    if (imgRatio > pageRatio) {
      renderW = maxW;
      renderH = maxW / imgRatio;
    } else {
      renderH = maxH;
      renderW = maxH * imgRatio;
    }

    const posX = margin + (maxW - renderW) / 2;
    const posY = margin + (maxH - renderH) / 2;

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(imgData, "JPEG", posX, posY, renderW, renderH, undefined, "FAST");

    // Header with Driver Name, Document Type & Page Number
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    const docLabel = `${options.driverName} - ${file.fileType.replace("_", " ")} (${file.name})`;
    pdf.text(docLabel, margin, 7);

    const pageNumText = `Page ${i + 1} of ${imageFiles.length}`;
    pdf.text(pageNumText, pageWidth - margin - pdf.getTextWidth(pageNumText), 7);
  }

  if (pdf) {
    const safeDriverName = options.driverName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filterSuffix = filter === "bw_scanner" ? "_Black_White" : filter === "grayscale" ? "_Grayscale" : "";
    const finalFilename = `${safeDriverName}_Driver_Documents${filterSuffix}.pdf`;
    pdf.save(finalFilename);
  }
}
