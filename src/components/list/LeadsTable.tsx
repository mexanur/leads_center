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
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
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

  const totalLeads = sortedLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalLeads / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalLeads);
  const paginatedLeads = sortedLeads.slice(startIndex, endIndex);

  // Check if all items on the current page are selected
  const isAllCurrentPageSelected =
    paginatedLeads.length > 0 &&
    paginatedLeads.every((l) => selectedIds.includes(l.id));

  const toggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = paginatedLeads.map((l) => l.id);
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedLeads.map((l) => l.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
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
            {paginatedLeads.map((lead) => {
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
                  {/* Selection Checkbox */}
                  <td
                    onClick={(e) => toggleSelectLead(lead.id, e)}
                    className="py-4 pl-4 pr-2 w-10 shrink-0"
                  >
                    <button className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 mt-1">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>

                  {/* Driver Name & Recruiter */}
                  <td className="py-4 px-4 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {lead.fullName}
                          </span>
                          {lead.locationState && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                              <MapPin className="w-2.5 h-2.5" />
                              {lead.locationState}
                            </span>
                          )}
                        </div>

                        {lead.assignedTo && (
                          <span className="text-[11px] text-zinc-400 block mt-0.5">
                            Recruiter: {lead.assignedTo.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Contact Info & Quick Actions */}
                  <td className="py-4 px-4 min-w-[190px]">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                        <span>{lead.phone}</span>
                        {cleanPhone && (
                          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                            <a
                              href={`tel:${cleanPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              title="Call driver"
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="WhatsApp"
                              className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </a>
                          </div>
                        )}
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400 truncate max-w-[170px]">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Lead Source */}
                  <td className="py-4 px-4 min-w-[170px]">
                    <SourceBadge
                      source={lead.source}
                      sourceDetails={lead.sourceDetails}
                    />
                  </td>

                  {/* Pipeline Stage Select */}
                  <td
                    onClick={(e) => e.stopPropagation()}
                    className="py-4 px-4 min-w-[180px]"
                  >
                    <select
                      value={lead.status}
                      onChange={(e) =>
                        onUpdateLeadStatus(lead.id, e.target.value as LeadStatus)
                      }
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors shadow-2xs"
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
                    <div className="space-y-1">
                      <CdlBadge
                        cdlType={lead.cdlType}
                        experienceYears={lead.experienceYears}
                        driverType={lead.driverType}
                      />
                      {lead.desiredPay && (
                        <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                          <DollarSign className="w-2.5 h-2.5" />
                          <span>{lead.desiredPay}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Next Reminder */}
                  <td className="py-4 px-4 min-w-[180px]">
                    {nextReminder && reminderAlert ? (
                      <div
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                          reminderAlert.isOverdue
                            ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 animate-pulse"
                            : reminderAlert.isDueSoon
                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                        }`}
                        title={`Reminder: ${nextReminder.title}`}
                      >
                        <Clock className="w-3 h-3" />
                        <span className="truncate max-w-[140px]">
                          {reminderAlert.alertText}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => onQuickAddReminder(lead.id, e)}
                        className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap"
                      >
                        <Plus className="w-3 h-3" /> Set reminder
                      </button>
                    )}
                  </td>

                  {/* Latest Note */}
                  <td className="py-4 px-4 min-w-[220px]">
                    {latestNote ? (
                      <div
                        className="text-xs text-zinc-600 dark:text-zinc-300 truncate max-w-[220px]"
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

      {/* Pagination Controls Toolbar */}
      {totalLeads > 0 && (
        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-850 flex items-center justify-between flex-wrap gap-3">
          {/* Left: Record summary */}
          <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Showing{" "}
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {startIndex + 1}–{endIndex}
            </span>{" "}
            of{" "}
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {totalLeads}
            </span>{" "}
            driver leads
          </div>

          {/* Center: Rows per page selector */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs font-bold px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-2xs"
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Right: Page Navigation */}
          <div className="flex items-center gap-1.5">
            {/* First Page */}
            <button
              disabled={safePage <= 1}
              onClick={() => setCurrentPage(1)}
              title="First Page"
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Prev Page */}
            <button
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            {/* Current Page Badge */}
            <span className="text-xs font-bold px-2 py-1 text-zinc-700 dark:text-zinc-300 bg-zinc-200/80 dark:bg-zinc-700 rounded-lg">
              {safePage} / {totalPages}
            </span>

            {/* Next Page */}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Last Page */}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Last Page"
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
