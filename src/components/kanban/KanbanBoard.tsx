"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import confetti from "canvas-confetti";
import { Lead, PIPELINE_COLUMNS, LeadStatus } from "@/types";
import { KanbanColumn } from "./KanbanColumn";
import { LeadCard } from "./LeadCard";

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => Promise<void>;
  onSelectLead: (lead: Lead) => void;
  onQuickAddNote: (leadId: string, e: React.MouseEvent) => void;
  onQuickAddReminder: (leadId: string, e: React.MouseEvent) => void;
  onAddLeadToStage: (stageId: string) => void;
  onDeleteLead?: (leadId: string) => Promise<void>;
  onLeadUpdated?: () => void;
}

export function KanbanBoard({
  leads,
  onUpdateLeadStatus,
  onSelectLead,
  onQuickAddNote,
  onQuickAddReminder,
  onAddLeadToStage,
  onDeleteLead,
  onLeadUpdated,
}: KanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const found = leads.find((l) => l.id === active.id);
    if (found) setActiveLead(found);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const activeLeadId = active.id as string;
    const overId = over.id as string;

    const currentLead = leads.find((l) => l.id === activeLeadId);
    if (!currentLead) return;

    // Determine target status
    let targetStatus: LeadStatus | null = null;

    // Is dropped over a column directly?
    const isColumn = PIPELINE_COLUMNS.some((col) => col.id === overId);
    if (isColumn) {
      targetStatus = overId as LeadStatus;
    } else {
      // Dropped over another lead card -> find that card's status
      const overLead = leads.find((l) => l.id === overId);
      if (overLead) {
        targetStatus = overLead.status as LeadStatus;
      }
    }

    if (targetStatus && targetStatus !== currentLead.status) {
      // Confetti celebration if moved to APPROVED_HIRED
      if (targetStatus === "APPROVED_HIRED") {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"],
        });
      }

      await onUpdateLeadStatus(activeLeadId, targetStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 min-h-[calc(100vh-280px)] custom-scrollbar">
        {PIPELINE_COLUMNS.map((column) => {
          const columnLeads = leads.filter((lead) => lead.status === column.id);
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              leads={columnLeads}
              onSelectLead={onSelectLead}
              onQuickAddNote={onQuickAddNote}
              onQuickAddReminder={onQuickAddReminder}
              onAddLeadToStage={onAddLeadToStage}
              onDeleteLead={onDeleteLead}
              onLeadUpdated={onLeadUpdated}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeLead ? (
          <LeadCard
            lead={activeLead}
            onSelect={() => {}}
            onQuickAddNote={() => {}}
            onQuickAddReminder={() => {}}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
