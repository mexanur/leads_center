"use client";

import React from "react";
import { Truck } from "lucide-react";
import { CDL_LABELS } from "@/types";

interface CdlBadgeProps {
  cdlType: string;
  experienceYears?: number;
  driverType?: string | null;
  size?: "sm" | "md";
}

export function CdlBadge({
  cdlType,
  experienceYears = 0,
  driverType,
  size = "sm",
}: CdlBadgeProps) {
  const label = CDL_LABELS[cdlType] || cdlType;
  const isClassA = cdlType === "CLASS_A";

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap whitespace-nowrap">
      <span
        className={`inline-flex items-center gap-1 font-semibold rounded-md border shrink-0 whitespace-nowrap ${
          isClassA
            ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
            : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
        } ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"}`}
      >
        <Truck className="w-3 h-3 shrink-0" />
        <span>{label}</span>
      </span>

      {experienceYears > 0 && (
        <span
          className={`font-medium rounded-md border bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 shrink-0 whitespace-nowrap ${
            size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs"
          }`}
        >
          {experienceYears} yr{experienceYears > 1 ? "s" : ""} exp
        </span>
      )}

      {driverType && (
        <span
          className={`font-medium rounded-md border bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shrink-0 whitespace-nowrap ${
            size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs"
          }`}
        >
          {driverType}
        </span>
      )}
    </div>
  );
}
