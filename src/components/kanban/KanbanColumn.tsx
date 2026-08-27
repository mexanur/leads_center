"use client";

import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Lead, PipelineColumn } from "@/types";
import { LeadCard } from "./LeadCard";

interface KanbanColumnProps {
  column: PipelineColumn;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onQuickAddNote: (leadId: string, e: React.MouseEvent) => void;
  onQuickAddReminder: (leadId: string, e: React.MouseEvent) => void;
  onAddLeadToStage: (stageId: string) => void;
  onShareToTelegram?: (lead: Lead) => void;
  onDeleteLead?: (leadId: string) => Promise<void>;
  onLeadUpdated?: () => void;
}

const INITIAL_PAGE_SIZE = 15;

export function KanbanColumn({
  column,
  leads,
  onSelectLead,
  onQuickAddNote,
  onQuickAddReminder,
  onAddLeadToStage,
  onShareToTelegram,
  onDeleteLead,
  onLeadUpdated,
}: KanbanColumnProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "Column", column },
  });

  const visibleLeads = leads.slice(0, visibleCount);
  const remainingCount = Math.max(0, leads.length - visibleCount);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border transition-all duration-150 min-w-[280px] sm:min-w-[300px] w-full shrink-0 flex-1 bg-zinc-100/70 dark:bg-zinc-900/60 p-3 ${
        isOver
          ? "border-blue-400 bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-blue-400/20"
          : column.borderColor
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${column.bgColor.replace("/60", "")} border ${column.borderColor}`} />
          <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
            {column.title}
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${column.badgeBg}`}
          >
            {leads.length}
          </span>
        </div>

        <button
          onClick={() => onAddLeadToStage(column.id)}
          title={`Add new driver to ${column.title}`}
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[140px] pr-0.5 custom-scrollbar">
        <SortableContext
          items={visibleLeads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {visibleLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onSelect={onSelectLead}
              onQuickAddNote={onQuickAddNote}
              onQuickAddReminder={onQuickAddReminder}
              onShareToTelegram={onShareToTelegram}
              onDeleteLead={onDeleteLead}
              onLeadUpdated={onLeadUpdated}
            />
          ))}
        </SortableContext>

        {/* Column-level Lazy Load / Show More Controls */}
        {leads.length > INITIAL_PAGE_SIZE && (
          <div className="pt-2 pb-1 flex flex-col items-center gap-1.5 border-t border-zinc-200/60 dark:border-zinc-800">
            <span className="text-[11px] font-semibold text-zinc-500">
              Showing {visibleLeads.length} of {leads.length} cards
            </span>
            <div className="flex items-center gap-1.5">
              {remainingCount > 0 && (
                <>
                  <button
                    onClick={() => setVisibleCount((prev) => prev + INITIAL_PAGE_SIZE)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3 h-3" />
                    +{Math.min(INITIAL_PAGE_SIZE, remainingCount)} more
                  </button>
                  <button
                    onClick={() => setVisibleCount(leads.length)}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    All ({leads.length})
                  </button>
                </>
              )}

              {visibleCount > INITIAL_PAGE_SIZE && (
                <button
                  onClick={() => setVisibleCount(INITIAL_PAGE_SIZE)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <ChevronUp className="w-3 h-3" />
                  Less
                </button>
              )}
            </div>
          </div>
        )}

        {leads.length === 0 && (
          <div className="h-28 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              No leads in this stage
            </p>
            <button
              onClick={() => onAddLeadToStage(column.id)}
              className="mt-1 text-xs text-blue-600 hover:underline font-medium cursor-pointer"
            >
              + Add driver lead
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
