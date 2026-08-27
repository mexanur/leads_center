"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Lead, PipelineColumn } from "@/types";
import { LeadCard } from "./LeadCard";

interface KanbanColumnProps {
  column: PipelineColumn;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onQuickAddNote: (leadId: string, e: React.MouseEvent) => void;
  onQuickAddReminder: (leadId: string, e: React.MouseEvent) => void;
  onAddLeadToStage: (stageId: string) => void;
  onDeleteLead?: (leadId: string) => Promise<void>;
  onLeadUpdated?: () => void;
}

export function KanbanColumn({
  column,
  leads,
  onSelectLead,
  onQuickAddNote,
  onQuickAddReminder,
  onAddLeadToStage,
  onDeleteLead,
  onLeadUpdated,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "Column", column },
  });

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
          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[140px] pr-0.5 custom-scrollbar">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onSelect={onSelectLead}
              onQuickAddNote={onQuickAddNote}
              onQuickAddReminder={onQuickAddReminder}
              onDeleteLead={onDeleteLead}
              onLeadUpdated={onLeadUpdated}
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="h-28 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              No leads in this stage
            </p>
            <button
              onClick={() => onAddLeadToStage(column.id)}
              className="mt-1 text-xs text-blue-600 hover:underline font-medium"
            >
              + Add driver lead
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
