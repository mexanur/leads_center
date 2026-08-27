"use client";

import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Phone,
  MessageSquare,
  Clock,
  AlertCircle,
  GripVertical,
  MapPin,
  DollarSign,
  MessageCircle,
  Calendar,
  UploadCloud,
  Trash2,
} from "lucide-react";
import { Lead } from "@/types";
import { SourceBadge } from "../common/SourceBadge";
import { CdlBadge } from "../common/CdlBadge";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { isReminderAlerting, formatRelativeTime, formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface LeadCardProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  onQuickAddNote: (leadId: string, e: React.MouseEvent) => void;
  onQuickAddReminder: (leadId: string, e: React.MouseEvent) => void;
  onDeleteLead?: (leadId: string) => Promise<void>;
  onLeadUpdated?: () => void;
  isOverlay?: boolean;
}

export function LeadCard({
  lead,
  onSelect,
  onQuickAddNote,
  onQuickAddReminder,
  onDeleteLead,
  onLeadUpdated,
  isOverlay = false,
}: LeadCardProps) {
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { type: "Lead", lead },
    disabled: isOverlay,
  });

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFiles(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFiles(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        const validFiles = files.filter((f) => f.size <= 25 * 1024 * 1024);
        if (validFiles.length === 0) {
          toast.error("File size cannot exceed 25MB");
          return;
        }

        setIsUploadingFiles(true);
        toast.loading(
          validFiles.length > 1
            ? `Attaching ${validFiles.length} documents to ${lead.fullName}...`
            : `Attaching "${validFiles[0].name}" to ${lead.fullName}...`,
          { id: `card-upload-${lead.id}` }
        );

        try {
          const formData = new FormData();
          validFiles.forEach((f) => formData.append("files", f));
          formData.append("fileType", "OTHER");
          formData.append("currentUserName", "Recruiter");

          const res = await fetch(`/api/leads/${lead.id}/files`, {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Failed to attach files");
          }

          toast.success(
            validFiles.length > 1
              ? `Successfully attached ${data.uploadedCount || validFiles.length} documents to ${lead.fullName}!`
              : `"${validFiles[0].name}" attached to ${lead.fullName}!`,
            { id: `card-upload-${lead.id}` }
          );

          if (onLeadUpdated) onLeadUpdated();
        } catch (err: any) {
          toast.error(err.message || "Failed to upload files", {
            id: `card-upload-${lead.id}`,
          });
        } finally {
          setIsUploadingFiles(false);
        }
      }
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  // Find most urgent active reminder
  const activeReminders = lead.reminders || [];
  const nextReminder = activeReminders.length > 0 ? activeReminders[0] : null;
  const reminderAlert = nextReminder
    ? isReminderAlerting(nextReminder.dueAt, nextReminder.advanceMinutes)
    : null;

  const notesCount = lead._count?.notes ?? lead.notes?.length ?? 0;
  const latestNote = lead.notes && lead.notes.length > 0 ? lead.notes[0] : null;

  const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, "") : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(lead)}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative bg-white dark:bg-zinc-800/90 rounded-2xl p-3.5 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md ${
        isOverlay
          ? "border-blue-500 shadow-xl ring-2 ring-blue-500/20 rotate-1 scale-102"
          : isDraggingFiles
          ? "border-blue-500 ring-4 ring-blue-500/30 scale-[1.02] shadow-lg"
          : reminderAlert?.isOverdue
          ? "border-red-300 dark:border-red-900/60 hover:border-red-400 bg-red-50/10"
          : reminderAlert?.isDueSoon
          ? "border-amber-300 dark:border-amber-900/60 hover:border-amber-400 bg-amber-50/10"
          : "border-zinc-200/90 dark:border-zinc-700/70 hover:border-zinc-300 dark:hover:border-zinc-600"
      }`}
    >
      {/* File Drop Drag Overlay */}
      {isDraggingFiles && (
        <div className="absolute inset-0 z-30 bg-blue-600/95 dark:bg-blue-600/95 text-white rounded-2xl flex flex-col items-center justify-center p-3 text-center gap-1.5 backdrop-blur-xs shadow-xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
          <UploadCloud className="w-7 h-7 animate-bounce text-blue-100" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-blue-100">
            Drop file(s) to attach
          </span>
          <span className="text-xs font-black truncate max-w-[200px] text-white underline decoration-blue-300">
            {lead.fullName}
          </span>
        </div>
      )}

      {/* File Uploading Spinner Overlay */}
      {isUploadingFiles && (
        <div className="absolute inset-0 z-30 bg-white/90 dark:bg-zinc-900/90 rounded-2xl flex flex-col items-center justify-center p-3 text-center gap-2 backdrop-blur-xs shadow-lg animate-in fade-in duration-150 pointer-events-none">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            Attaching documents...
          </span>
        </div>
      )}
      {/* Top row: Drag handle, Driver Name, State, Recruiter */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-grab active:cursor-grabbing"
            title="Drag to change stage"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {lead.fullName}
              </h4>
              {lead.locationState && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                  <MapPin className="w-2.5 h-2.5" />
                  {lead.locationState}
                </span>
              )}
            </div>

            {/* Phone & Quick communication actions */}
            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {lead.phone}
              </span>
              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                {cleanPhone && (
                  <>
                    <a
                      href={`tel:${cleanPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      title="Call driver"
                      className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      <Phone className="w-3 h-3" />
                    </a>
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Message on WhatsApp"
                      className="p-1 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40"
                    >
                      <MessageCircle className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Lead Creation Date & Time */}
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
              <Calendar className="w-3 h-3 text-zinc-400 dark:text-zinc-500 shrink-0" />
              <span>{formatDate(lead.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Top Right: Delete Button & Recruiter Avatar */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteOpen(true);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all cursor-pointer"
            title={`Delete lead ${lead.fullName}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {lead.assignedTo && (
            <div
              className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0"
              title={`Recruiter: ${lead.assignedTo.name}`}
            >
              {lead.assignedTo.name.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* Badges: Source and CDL */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <SourceBadge source={lead.source} sourceDetails={lead.sourceDetails} />
        <CdlBadge
          cdlType={lead.cdlType}
          experienceYears={lead.experienceYears}
          driverType={lead.driverType}
        />
      </div>

      {/* Desired Pay / Route summary if set */}
      {lead.desiredPay && (
        <div className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50/60 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-200/50 dark:border-emerald-900/40">
          <DollarSign className="w-3 h-3" />
          <span>{lead.desiredPay}</span>
        </div>
      )}

      {/* Latest Note Snippet */}
      {latestNote && (
        <div className="mt-2.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
            <span className="font-semibold text-zinc-500 dark:text-zinc-400">
              {latestNote.tag || "Note"}
            </span>
            <span>{formatRelativeTime(latestNote.createdAt)}</span>
          </div>
          <p className="line-clamp-2 leading-relaxed italic text-[11px]">
            &ldquo;{latestNote.content}&rdquo;
          </p>
        </div>
      )}

      {/* Footer Indicators & Reminders */}
      <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-1 text-xs">
        {/* Next Reminder Pill */}
        {nextReminder && reminderAlert ? (
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
              reminderAlert.isOverdue
                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 animate-pulse"
                : reminderAlert.isDueSoon
                ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
            }`}
            title={`Reminder: ${nextReminder.title}`}
          >
            {reminderAlert.isOverdue ? (
              <AlertCircle className="w-3 h-3 text-red-600" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            <span className="truncate max-w-[130px]">{reminderAlert.alertText}</span>
          </div>
        ) : (
          <button
            onClick={(e) => onQuickAddReminder(lead.id, e)}
            className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Clock className="w-3 h-3" />
            + Set reminder
          </button>
        )}

        {/* Notes Count & Quick Add */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => onQuickAddNote(lead.id, e)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            title={`${notesCount} notes`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>{notesCount}</span>
          </button>
        </div>
      </div>

      {/* Card Delete Safety Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title={`Delete ${lead.fullName}?`}
        message={
          <div className="space-y-1">
            <p>
              Are you sure you want to permanently delete lead for{" "}
              <strong className="text-zinc-900 dark:text-zinc-100 font-bold">
                {lead.fullName}
              </strong>
              ?
            </p>
            <p className="text-red-600 dark:text-red-400 font-semibold text-[11px]">
              ⚠️ All associated notes, follow-up reminders, documents, and activity history will be permanently deleted.
            </p>
          </div>
        }
        confirmText="Delete Lead"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            if (onDeleteLead) {
              await onDeleteLead(lead.id);
            } else {
              const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
              if (res.ok) {
                toast.success(`Deleted ${lead.fullName}`);
                if (onLeadUpdated) onLeadUpdated();
              } else {
                toast.error("Failed to delete lead");
              }
            }
          } catch {
            toast.error("Failed to delete lead");
          } finally {
            setIsDeleting(false);
            setConfirmDeleteOpen(false);
          }
        }}
      />
    </div>
  );
}
