"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  RotateCcw,
  Download,
  LayoutGrid,
  List as ListIcon,
  X,
} from "lucide-react";
import { SOURCE_CONFIG, PIPELINE_COLUMNS, CDL_LABELS, User } from "@/types";

interface FilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  source: string;
  onSourceChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  cdlType: string;
  onCdlTypeChange: (val: string) => void;
  recruiterId: string;
  onRecruiterChange: (val: string) => void;
  viewMode: "kanban" | "list";
  onViewModeChange: (mode: "kanban" | "list") => void;
  recruiters: User[];
  onResetFilters: () => void;
  onExportCsv: () => void;
  totalFiltered: number;
}

export function FilterBar({
  search,
  onSearchChange,
  source,
  onSourceChange,
  status,
  onStatusChange,
  cdlType,
  onCdlTypeChange,
  recruiterId,
  onRecruiterChange,
  viewMode,
  onViewModeChange,
  recruiters,
  onResetFilters,
  onExportCsv,
  totalFiltered,
}: FilterBarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync external search reset
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleInputChange = (val: string) => {
    setLocalSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(val);
    }, 200);
  };

  const handleClear = () => {
    setLocalSearch("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearchChange("");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    (source !== "" && source !== "ALL") ||
    (status !== "" && status !== "ALL") ||
    (cdlType !== "" && cdlType !== "ALL") ||
    (recruiterId !== "" && recruiterId !== "ALL");

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search & Inputs */}
        <div className="flex-1 flex flex-wrap items-center gap-2.5">
          {/* Search Box with Debounce */}
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Search driver name, phone, email, state..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
            />
            {localSearch && (
              <button
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lead Source Filter */}
          <select
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Sources</option>
            {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>

          {/* Stage Filter */}
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Stages</option>
            {PIPELINE_COLUMNS.map((col) => (
              <option key={col.id} value={col.id}>
                {col.title}
              </option>
            ))}
          </select>

          {/* CDL Type Filter */}
          <select
            value={cdlType}
            onChange={(e) => onCdlTypeChange(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All CDL Types</option>
            {Object.entries(CDL_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Recruiter Filter */}
          <select
            value={recruiterId}
            onChange={(e) => onRecruiterChange(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">All Recruiters</option>
            {recruiters.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>

        {/* View Switcher & Export */}
        <div className="flex items-center gap-2 justify-end">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mr-1 hidden sm:inline">
            Showing <strong className="text-zinc-700 dark:text-zinc-200">{totalFiltered}</strong> driver{totalFiltered === 1 ? "" : "s"}
          </span>

          {/* CSV Export */}
          <button
            onClick={onExportCsv}
            title="Export filtered leads to CSV"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 border border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => onViewModeChange("kanban")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "kanban"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => onViewModeChange("list")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
