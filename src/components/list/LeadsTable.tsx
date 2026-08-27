"use client";

import React, { useState } from "react";
import {
  Phone,
  Mail,
  MessageCircle,
  Clock,
  MessageSquare,
  ChevronDown,
  Trash2,
  MapPin,
  CheckSquare,
  Square,
  ArrowUpDown,
  DollarSign,
  Plus,
} from "lucide-react";
import { Lead, PIPELINE_COLUMNS, LeadStatus } from "@/types";
import { SourceBadge } from "../common/SourceBadge";
import { CdlBadge } from "../common/CdlBadge";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { isReminderAlerting, formatRelativeTime, formatShortDate } from "@/lib/utils";
import { toast } from "sonner";

interface LeadsTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, newStatus: LeadStatus) => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
  onQuickAddNote: (leadId: string, e: React.MouseEvent) => void;
  onQuickAddReminder: (leadId: string, e: React.MouseEvent) => void;
  onLeadUpdated?: () => void;
}

type SortField = "createdAt" | "fullName" | "status" | "experienceYears";

export function LeadsTable({
  leads,
  onSelectLead,
  onUpdateLeadStatus,
  onDeleteLead,
  onQuickAddNote,
  onQuickAddReminder,
  onLeadUpdated,
}: LeadsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    confirmText: string;
    variant: "danger" | "warning" | "info";
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Delete",
    variant: "danger",
    onConfirm: async () => {},
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    let comparison = 0;
    if (sortField === "createdAt") {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === "fullName") {
      comparison = a.fullName.localeCompare(b.fullName);
    } else if (sortField === "status") {
      comparison = a.status.localeCompare(b.status);
    } else if (sortField === "experienceYears") {
      comparison = (a.experienceYears || 0) - (b.experienceYears || 0);
    }
    return sortAsc ? comparison : -comparison;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const toggleSelectLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatus = async (newStatus: LeadStatus) => {
    for (const id of selectedIds) {
      await onUpdateLeadStatus(id, newStatus);
    }
    setSelectedIds([]);
  };

  const handleTriggerBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${count} Selected Driver Lead${count > 1 ? "s" : ""}?`,
      message: (
        <div className="space-y-1">
          <p>
            Are you sure you want to permanently delete{" "}
            <strong className="text-zinc-900 dark:text-zinc-100 font-bold">
              {count} selected lead{count > 1 ? "s" : ""}
            </strong>
            ?
          </p>
          <p className="text-red-600 dark:text-red-400 font-semibold text-[11px]">
            ⚠️ All associated notes, follow-up reminders, documents, and activity history will be permanently deleted.
          </p>
        </div>
      ),
      confirmText: `Delete ${count} Lead${count > 1 ? "s" : ""}`,
      variant: "danger",
      onConfirm: async () => {
        setIsModalLoading(true);
        try {
          const res = await fetch("/api/leads", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadIds: selectedIds }),
          });
          const data = await res.json();
          if (res.ok) {
            toast.success(
              `Successfully deleted ${data.deletedCount || count} driver lead(s)`
            );
            setSelectedIds([]);
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            if (onLeadUpdated) onLeadUpdated();
          } else {
            toast.error(data.error || "Failed to delete leads");
          }
        } catch (err) {
          toast.error("Failed to delete leads");
        } finally {
          setIsModalLoading(false);
        }
      },
    });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50/90 dark:bg-blue-950/40 px-4 py-2.5 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-xs font-bold text-blue-900 dark:text-blue-200">
            <span>
              {selectedIds.length} driver lead{selectedIds.length > 1 ? "s" : ""}{" "}
              selected
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Deselect All
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Move to Stage dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                Move to:
              </span>
              <select
                onChange={(e) => {
                  if (e.target.value) handleBulkStatus(e.target.value as LeadStatus);
                }}
                defaultValue=""
                className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-blue-300 dark:border-blue-700 text-zinc-800 dark:text-zinc-200 font-semibold shadow-xs"
              >
                <option value="" disabled>
                  Select stage...
                </option>
                {PIPELINE_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Bulk Delete Button */}
            <button
              onClick={handleTriggerBulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-red-700 dark:text-red-300 bg-red-100/80 hover:bg-red-200 dark:bg-red-950/70 dark:hover:bg-red-900/80 rounded-lg border border-red-200 dark:border-red-800 transition-colors shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Container with proper minimum width and horizontal scroll */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[1180px] text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-wider">
              {/* Checkbox */}
              <th className="py-3.5 pl-4 pr-2 w-10 shrink-0">
                <button
                  onClick={toggleSelectAll}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  {selectedIds.length > 0 && selectedIds.length === leads.length ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>

              {/* Driver Name */}
              <th
                onClick={() => toggleSort("fullName")}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 min-w-[200px]"
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span>Driver Name</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>

              {/* Contact & Quick Actions */}
              <th className="py-3.5 px-4 min-w-[220px] whitespace-nowrap">
                Contact & Quick Actions
              </th>

              {/* Lead Source */}
              <th className="py-3.5 px-4 min-w-[170px] whitespace-nowrap">
                Lead Source
              </th>

              {/* Pipeline Stage */}
              <th
                onClick={() => toggleSort("status")}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 min-w-[180px]"
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span>Pipeline Stage</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>

              {/* CDL & Exp */}
              <th
                onClick={() => toggleSort("experienceYears")}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 min-w-[180px]"
              >
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span>CDL & Exp</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>

              {/* Next Reminder */}
              <th className="py-3.5 px-4 min-w-[180px] whitespace-nowrap">
                Next Reminder
              </th>

              {/* Latest Note */}
              <th className="py-3.5 px-4 min-w-[220px]">
                Latest Note
              </th>

              {/* Added Date */}
              <th
                onClick={() => toggleSort("createdAt")}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-800 dark:hover:text-zinc-200 text-right pr-5 min-w-[110px]"
              >
                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                  <span>Added</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
            {sortedLeads.map((lead) => {
              const isSelected = selectedIds.includes(lead.id);
              const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, "") : "";
              const activeReminders = lead.reminders || [];
              const nextReminder =
                activeReminders.length > 0 ? activeReminders[0] : null;
              const reminderAlert = nextReminder
                ? isReminderAlerting(nextReminder.dueAt, nextReminder.advanceMinutes)
                : null;
              const latestNote =
                lead.notes && lead.notes.length > 0 ? lead.notes[0] : null;
              const notesCount =
                lead._count?.notes ?? lead.notes?.length ?? 0;

              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-50/40 dark:bg-blue-950/20"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="py-4 pl-4 pr-2" onClick={(e) => toggleSelectLead(lead.id, e)}>
                    <button className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>

                  {/* Driver Name & Location */}
                  <td className="py-4 px-4 min-w-[200px]">
                    <div className="flex items-center gap-1.5 flex-wrap whitespace-nowrap">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {lead.fullName}
                      </span>
                      {lead.locationState && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">
                          <MapPin className="w-2.5 h-2.5" />
                          {lead.locationState}
                        </span>
                      )}
                    </div>
                    {lead.desiredPay && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 whitespace-nowrap">
                        <DollarSign className="w-3 h-3" />
                        <span>{lead.desiredPay}</span>
                      </div>
                    )}
                  </td>

                  {/* Contact info & click to call */}
                  <td className="py-4 px-4 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2.5 whitespace-nowrap">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono text-xs">
                        {lead.phone}
                      </span>

                      {/* Quick Communication Toolbuttons */}
                      <div className="flex items-center gap-1">
                        {cleanPhone && (
                          <>
                            <a
                              href={`tel:${cleanPhone}`}
                              title="Call Driver"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              title="WhatsApp Driver"
                              className="p-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-300 dark:hover:bg-green-900/60 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            title={`Email: ${lead.email}`}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Lead Source */}
                  <td className="py-4 px-4 min-w-[170px]">
                    <SourceBadge
                      source={lead.source}
                      sourceDetails={lead.sourceDetails}
                      showDetails
                    />
                  </td>

                  {/* Pipeline Stage Select */}
                  <td className="py-4 px-4 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        onUpdateLeadStatus(lead.id, e.target.value as LeadStatus)
                      }
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs whitespace-nowrap"
                    >
                      {PIPELINE_COLUMNS.map((col) => (
                        <option key={col.id} value={col.id}>
                          {col.title}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* CDL & Experience */}
                  <td className="py-4 px-4 min-w-[180px]">
                    <CdlBadge
                      cdlType={lead.cdlType}
                      experienceYears={lead.experienceYears}
                      driverType={lead.driverType}
                    />
                  </td>

                  {/* Next Reminder */}
                  <td className="py-4 px-4 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                    {nextReminder && reminderAlert ? (
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs border whitespace-nowrap ${
                          reminderAlert.isOverdue
                            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800"
                            : reminderAlert.isDueSoon
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                        }`}
                        title={nextReminder.title}
                      >
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{reminderAlert.alertText}</span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => onQuickAddReminder(lead.id, e)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-blue-600 transition-colors whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" /> Set reminder
                      </button>
                    )}
                  </td>

                  {/* Latest Note */}
                  <td className="py-4 px-4 min-w-[220px] max-w-[280px]" onClick={(e) => e.stopPropagation()}>
                    {latestNote ? (
                      <div
                        onClick={() => onSelectLead(lead)}
                        className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                        title={latestNote.content}
                      >
                        <span className="font-bold text-zinc-500 dark:text-zinc-400 mr-1 whitespace-nowrap">
                          [{latestNote.tag || "Note"}]:
                        </span>
                        <span className="truncate inline-block align-bottom max-w-[180px]">
                          {latestNote.content}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => onQuickAddNote(lead.id, e)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-blue-600 whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add note
                      </button>
                    )}
                  </td>

                  {/* Date Created */}
                  <td className="py-4 px-4 text-right pr-5 text-zinc-400 font-medium whitespace-nowrap min-w-[110px]">
                    <span className="text-xs">
                      {formatShortDate(lead.createdAt)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {leads.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              No truck driver leads found
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              Try adjusting your search query or filters.
            </p>
          </div>
        )}
      </div>

      {/* Bulk Delete Safety Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        isLoading={isModalLoading}
      />
    </div>
  );
}
