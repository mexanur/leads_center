"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  MessageSquare,
  History,
  ShieldCheck,
  Truck,
  MapPin,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Save,
  Check,
  Copy,
  ExternalLink,
  FolderArchive,
  FileText,
  UploadCloud,
  Download,
  Eye,
  FileCheck,
  Paperclip,
  File,
  ArrowUpRight,
  FileSpreadsheet,
  CheckSquare,
  Square,
  RefreshCw,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  Lead,
  Note,
  Reminder,
  LeadFile,
  FileCategory,
  FILE_CATEGORY_CONFIG,
  ActivityLog,
  PIPELINE_COLUMNS,
  CDL_LABELS,
  AVAILABLE_ENDORSEMENTS,
  COMMON_NOTE_TAGS,
  SOURCE_CONFIG,
  User,
  LeadStatus,
} from "@/types";
import { SourceBadge } from "../common/SourceBadge";
import { CdlBadge } from "../common/CdlBadge";
import { ConfirmationModal } from "../common/ConfirmationModal";
import { toast } from "sonner";
import { formatDate, formatRelativeTime, isReminderAlerting } from "@/lib/utils";

interface LeadDetailDrawerProps {
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated: () => void;
  recruiters: User[];
  currentUser: User | null;
  defaultTab?: "overview" | "notes" | "reminders" | "files" | "activity";
}

// Client-side SWR memory cache for instant drawer opens
const leadClientCache = new Map<string, { data: Lead; timestamp: number }>();

export function LeadDetailDrawer({
  leadId,
  onClose,
  onLeadUpdated,
  recruiters,
  currentUser,
  defaultTab = "overview",
}: LeadDetailDrawerProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "notes" | "reminders" | "files" | "activity"
  >(defaultTab);

  // Helper to sync lead fields into form states
  const syncLeadState = (data: Lead) => {
    setLead(data);
    setFullName(data.fullName || "");
    setPhone(data.phone || "");
    setEmail(data.email || "");
    setSource(data.source || "FACEBOOK");
    setSourceDetails(data.sourceDetails || "");
    setStatus(data.status as LeadStatus);
    setCdlType(data.cdlType || "CLASS_A");
    setExperienceYears(data.experienceYears || 0);
    setDriverType(data.driverType || "OTR");
    setLocationState(data.locationState || "");
    setDesiredPay(data.desiredPay || "");
    setNotesText(data.notesText || "");
    setAssignedToId(data.assignedToId || "");

    if (data.endorsements) {
      try {
        setSelectedEndorsements(JSON.parse(data.endorsements));
      } catch {
        setSelectedEndorsements([]);
      }
    } else {
      setSelectedEndorsements([]);
    }
  };

  // Fetch full lead details with SWR cache
  const fetchLead = async (id: string, isBackground = false) => {
    if (!isBackground) {
      const cached = leadClientCache.get(id);
      if (cached) {
        syncLeadState(cached.data);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    }

    try {
      const res = await fetch(`/api/leads/${id}`);
      if (res.ok) {
        const data: Lead = await res.json();
        leadClientCache.set(id, { data, timestamp: Date.now() });
        syncLeadState(data);
      }
    } catch (err) {
      console.error("Failed to load lead details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchLead(leadId);
      setActiveTab(defaultTab);
      // Pre-fill with today's current date and current time
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      setNewReminderDate(`${yyyy}-${mm}-${dd}`);
      setNewReminderTime(`${hours}:${mins}`);
    } else {
      setLead(null);
    }
  }, [leadId, defaultTab]);

  // Note form state
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteTag, setNewNoteTag] = useState("Call Log - Spoke with Driver");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Reminder form state
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderDate, setNewReminderDate] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [newReminderTime, setNewReminderTime] = useState(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${mins}`;
  });
  const [newReminderAdvance, setNewReminderAdvance] = useState(15);
  const [newReminderPriority, setNewReminderPriority] = useState<"NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);
  const [selectedReminderIds, setSelectedReminderIds] = useState<string[]>([]);

  // File upload state
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [fileType, setFileType] = useState<string>("CDL_FRONT");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileCategoryFilter, setFileCategoryFilter] = useState<string>("ALL");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [activityFilter, setActivityFilter] = useState<string>("ALL");

  // Editable Profile state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("");
  const [sourceDetails, setSourceDetails] = useState("");
  const [status, setStatus] = useState<LeadStatus>("NEW_LEAD");
  const [cdlType, setCdlType] = useState("CLASS_A");
  const [experienceYears, setExperienceYears] = useState(0);
  const [driverType, setDriverType] = useState("OTR");
  const [locationState, setLocationState] = useState("");
  const [desiredPay, setDesiredPay] = useState("");
  const [notesText, setNotesText] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [selectedEndorsements, setSelectedEndorsements] = useState<string[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSavedSuccess, setProfileSavedSuccess] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Custom Confirmation Modal state
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
  const [isModalLoading, setIsModalLoading] = useState(false);

  if (!leadId) return null;

  const handleCopyPhone = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (phone) {
      navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      toast.dismiss("clipboard-phone");
      toast.success("Phone number copied to clipboard", { id: "clipboard-phone" });
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleCopyEmail = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (email) {
      navigator.clipboard.writeText(email);
      setCopiedEmail(true);
      toast.dismiss("clipboard-email");
      toast.success("Email address copied to clipboard", { id: "clipboard-email" });
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!lead) return;
    setIsSavingProfile(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          source,
          sourceDetails,
          status,
          cdlType,
          experienceYears: Number(experienceYears),
          endorsements: selectedEndorsements,
          driverType,
          locationState,
          desiredPay,
          notesText,
          assignedToId: assignedToId || null,
          currentUserName: currentUser?.name || "Recruiter",
        }),
      });
      if (res.ok) {
        setProfileSavedSuccess(true);
        setTimeout(() => setProfileSavedSuccess(false), 2500);
        fetchLead(lead.id);
        onLeadUpdated();
      }
    } catch (err) {
      console.error("Error saving lead profile:", err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleStatusChange = async (newStatus: LeadStatus) => {
    setStatus(newStatus);
    if (!lead) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          currentUserName: currentUser?.name || "Recruiter",
        }),
      });
      if (res.ok) {
        fetchLead(lead.id);
        onLeadUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newNoteContent.trim()) return;
    setIsSubmittingNote(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newNoteContent,
          tag: newNoteTag,
          authorId: currentUser?.id,
          currentUserName: currentUser?.name || "Recruiter",
        }),
      });
      if (res.ok) {
        setNewNoteContent("");
        fetchLead(lead.id);
        onLeadUpdated();
      }
    } catch (err) {
      console.error("Error adding note:", err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Note?",
      message: (
        <p>
          Are you sure you want to permanently delete this note? This action cannot be undone.
        </p>
      ),
      confirmText: "Delete Note",
      variant: "danger",
      onConfirm: async () => {
        setIsModalLoading(true);
        try {
          const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
          if (res.ok && lead) {
            toast.success("Note deleted");
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            fetchLead(lead.id);
            onLeadUpdated();
          } else {
            toast.error("Failed to delete note");
          }
        } catch (err) {
          toast.error("Failed to delete note");
        } finally {
          setIsModalLoading(false);
        }
      },
    });
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newReminderTitle.trim() || !newReminderDate || !newReminderTime) return;

    const dueAtDate = new Date(`${newReminderDate}T${newReminderTime}:00`);
    if (dueAtDate.getTime() <= Date.now()) {
      toast.error("Reminder time cannot be in the past. Please select a future date and time.");
      return;
    }

    setIsSubmittingReminder(true);
    try {
      const dueAtString = `${newReminderDate}T${newReminderTime}:00`;
      const res = await fetch(`/api/leads/${lead.id}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newReminderTitle.trim(),
          dueAt: new Date(dueAtString).toISOString(),
          advanceMinutes: Number(newReminderAdvance),
          priority: newReminderPriority,
          userId: currentUser?.id,
          currentUserName: currentUser?.name || "Recruiter",
        }),
      });
      if (res.ok) {
        toast.success("Reminder scheduled!");
        setNewReminderTitle("");
        fetchLead(lead.id);
        onLeadUpdated();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add reminder");
      }
    } catch (err) {
      console.error("Error adding reminder:", err);
      toast.error("Failed to add reminder");
    } finally {
      setIsSubmittingReminder(false);
    }
  };

  const handleToggleReminderComplete = async (reminderId: string, isCompleted: boolean) => {
    try {
      const res = await fetch(`/api/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isCompleted: !isCompleted,
          currentUserName: currentUser?.name || "Recruiter",
        }),
      });
      if (res.ok && lead) {
        toast.success(isCompleted ? "Reminder reopened" : "Reminder marked completed");
        fetchLead(lead.id);
        onLeadUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSnoozeReminder = async (reminderId: string, minutes: number) => {
    try {
      const res = await fetch(`/api/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snoozeMinutes: minutes }),
      });
      if (res.ok && lead) {
        toast.success(`Reminder snoozed for ${minutes}m`);
        fetchLead(lead.id);
        onLeadUpdated();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReminder = (reminderId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Follow-up Reminder?",
      message: (
        <p>
          Are you sure you want to delete this scheduled follow-up reminder?
        </p>
      ),
      confirmText: "Delete Reminder",
      variant: "danger",
      onConfirm: async () => {
        setIsModalLoading(true);
        try {
          const res = await fetch(`/api/reminders/${reminderId}`, { method: "DELETE" });
          if (res.ok && lead) {
            toast.success("Reminder deleted");
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            fetchLead(lead.id);
            onLeadUpdated();
          } else {
            toast.error("Failed to delete reminder");
          }
        } catch (err) {
          toast.error("Failed to delete reminder");
        } finally {
          setIsModalLoading(false);
        }
      },
    });
  };

  const toggleSelectReminder = (reminderId: string) => {
    setSelectedReminderIds((prev) =>
      prev.includes(reminderId) ? prev.filter((id) => id !== reminderId) : [...prev, reminderId]
    );
  };

  const toggleSelectAllReminders = (reminders: Reminder[]) => {
    const allIds = reminders.map((r) => r.id);
    const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedReminderIds.includes(id));
    if (isAllSelected) {
      setSelectedReminderIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedReminderIds((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleBulkDeleteReminders = () => {
    if (!lead || selectedReminderIds.length === 0) return;
    const count = selectedReminderIds.length;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${count} Selected Follow-up${count > 1 ? "s" : ""}?`,
      message: (
        <p>
          Are you sure you want to permanently delete <strong>{count} selected follow-up reminder(s)</strong>?
        </p>
      ),
      confirmText: `Delete ${count} Reminder${count > 1 ? "s" : ""}`,
      variant: "danger",
      onConfirm: async () => {
        setIsModalLoading(true);
        try {
          const res = await fetch(`/api/leads/${lead.id}/reminders`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reminderIds: selectedReminderIds,
              currentUserName: currentUser?.name || "Recruiter",
            }),
          });
          const data = await res.json();
          if (res.ok) {
            toast.success(`Deleted ${data.deletedCount || count} reminder(s)`);
            setSelectedReminderIds([]);
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            fetchLead(lead.id);
            onLeadUpdated();
          } else {
            toast.error(data.error || "Failed to delete reminders");
          }
        } catch (err) {
          toast.error("Failed to delete reminders");
        } finally {
          setIsModalLoading(false);
        }
      },
    });
  };

  const handleDeleteLead = () => {
    if (!lead) return;
    setConfirmModal({
      isOpen: true,
      title: "Permanently Delete Driver Lead?",
      message: (
        <div className="space-y-2">
          <p>
            Are you sure you want to permanently delete lead for{" "}
            <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{lead.fullName}</strong>{" "}
            ({lead.phone})?
          </p>
          <p className="text-red-600 dark:text-red-400 font-semibold text-[11px]">
            ⚠️ This will permanently remove this driver, all logged notes, active reminders, and timeline activity logs.
          </p>
        </div>
      ),
      confirmText: "Delete Driver Lead",
      variant: "danger",
      onConfirm: async () => {
        setIsModalLoading(true);
        try {
          const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
          if (res.ok) {
            toast.success(`Lead ${lead.fullName} permanently deleted`);
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            onClose();
            onLeadUpdated();
          } else {
            toast.error("Failed to delete lead");
          }
        } catch (err) {
          toast.error("Failed to delete lead");
        } finally {
          setIsModalLoading(false);
        }
      },
    });
  };

  const addFilesToUpload = (newFiles: File[]) => {
    const validFiles: File[] = [];
    for (const f of newFiles) {
      if (f.size > 25 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds maximum size of 25MB`);
        continue;
      }
      validFiles.push(f);
    }
    setFilesToUpload((prev) => {
      const existingKeys = new Set(prev.map((p) => `${p.name}_${p.size}`));
      const nonDuplicates = validFiles.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...nonDuplicates];
    });
  };

  const removeStagedFile = (index: number) => {
    setFilesToUpload((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || filesToUpload.length === 0) {
      toast.error("Please select one or more files to upload");
      return;
    }

    setIsUploadingFile(true);
    try {
      const formData = new FormData();
      filesToUpload.forEach((f) => formData.append("files", f));
      formData.append("fileType", fileType);
      if (currentUser?.id) formData.append("userId", currentUser.id);
      formData.append("currentUserName", currentUser?.name || "Recruiter");

      const res = await fetch(`/api/leads/${lead.id}/files`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document(s)");
      }

      toast.success(
        filesToUpload.length > 1
          ? `Successfully uploaded ${data.uploadedCount || filesToUpload.length} documents!`
          : `"${filesToUpload[0].name}" uploaded successfully!`
      );
      setFilesToUpload([]);
      // Reset input element if present
      const fileInput = document.getElementById("lead-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      fetchLead(lead.id);
      onLeadUpdated();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload document(s)");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteFile = (fileId: string, fileName: string) => {
    if (!lead) return;
    setConfirmModal({
      isOpen: true,
      title: "Delete Document?",
      message: (
        <div className="space-y-1">
          <p>
            Are you sure you want to permanently delete document{" "}
            <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{fileName}</strong>?
          </p>
          <p className="text-red-600 dark:text-red-400 font-semibold text-[11px]">
            ⚠️ This file will be permanently removed from Supabase storage and cannot be restored.
          </p>
        </div>
      ),
      confirmText: "Delete File",
      variant: "danger",
      onConfirm: async () => {
        setIsModalLoading(true);
        try {
          const res = await fetch(
            `/api/leads/${lead.id}/files/${fileId}?userName=${encodeURIComponent(
              currentUser?.name || "Recruiter"
            )}`,
            { method: "DELETE" }
          );
          if (res.ok) {
            toast.success("Document deleted");
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            fetchLead(lead.id);
            onLeadUpdated();
          } else {
            toast.error("Failed to delete document");
          }
        } catch (err) {
          toast.error("Failed to delete document");
        } finally {
          setIsModalLoading(false);
        }
      },
    });
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string) => {
    try {
      toast.info(`Starting download: ${fileName}`);
      // Use proxy endpoint to guarantee Content-Disposition attachment download
      const proxyUrl = `/api/download?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(fileName)}`;
      const a = document.createElement("a");
      a.href = proxyUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Download error:", err);
      // Fallback direct open
      window.open(fileUrl, "_blank");
    }
  };

  const toggleSelectFile = (fileId: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const toggleSelectAllFiles = (files: LeadFile[]) => {
    const allIds = files.map((f) => f.id);
    const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedFileIds.includes(id));
    if (isAllSelected) {
      setSelectedFileIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedFileIds((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleBulkDeleteFiles = () => {
    if (!lead || selectedFileIds.length === 0) return;
    const count = selectedFileIds.length;
    setConfirmModal({
      isOpen: true,
      title: `Delete ${count} Selected Document${count > 1 ? "s" : ""}?`,
      message: (
        <div className="space-y-1">
          <p>
            Are you sure you want to permanently delete{" "}
            <strong className="text-zinc-900 dark:text-zinc-100 font-bold">{count} selected document(s)</strong>?
          </p>
          <p className="text-red-600 dark:text-red-400 font-semibold text-[11px]">
            ⚠️ These files will be permanently removed from Supabase cloud storage and cannot be restored.
          </p>
        </div>
      ),
      confirmText: `Delete ${count} File${count > 1 ? "s" : ""}`,
      variant: "danger",
      onConfirm: async () => {
        setIsModalLoading(true);
        try {
          const res = await fetch(`/api/leads/${lead.id}/files`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileIds: selectedFileIds,
              currentUserName: currentUser?.name || "Recruiter",
            }),
          });
          const data = await res.json();
          if (res.ok) {
            toast.success(`Successfully deleted ${data.deletedCount || count} document(s)`);
            setSelectedFileIds([]);
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            fetchLead(lead.id);
            onLeadUpdated();
          } else {
            toast.error(data.error || "Failed to delete files");
          }
        } catch (err) {
          toast.error("Failed to delete files");
        } finally {
          setIsModalLoading(false);
        }
      },
    });
  };

  const toggleEndorsement = (item: string) => {
    setSelectedEndorsements((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const cleanPhone = phone ? phone.replace(/\D/g, "") : "";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 truncate">
                {lead?.fullName || "Loading..."}
              </h2>
              {lead?.locationState && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
                  <MapPin className="w-3 h-3" />
                  {lead.locationState}
                </span>
              )}
            </div>

            {/* Phone, email, quick links */}
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
                <span>{phone}</span>
                <button
                  type="button"
                  onClick={(e) => handleCopyPhone(e)}
                  title="Copy phone"
                  className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  {copiedPhone ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {cleanPhone && (
                <div className="flex items-center gap-1">
                  <a
                    href={`tel:${cleanPhone}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 transition-colors"
                  >
                    <Phone className="w-3 h-3" /> Call
                  </a>
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300 hover:bg-green-200 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3" /> WhatsApp
                  </a>
                  <a
                    href={`sms:${cleanPhone}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 hover:bg-blue-200 transition-colors"
                  >
                    SMS
                  </a>
                </div>
              )}

              {email && (
                <div className="flex items-center gap-1 font-semibold text-zinc-800 dark:text-zinc-200">
                  <a
                    href={`mailto:${email}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[180px]"
                    title={`Send email to ${email}`}
                  >
                    {email}
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    title="Copy email address"
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  >
                    {copiedEmail ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pipeline Stage Bar */}
        <div className="px-4 py-2.5 bg-zinc-100/70 dark:bg-zinc-800/30 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          <span className="text-[11px] font-bold text-zinc-500 uppercase mr-1 shrink-0">
            Stage:
          </span>
          {PIPELINE_COLUMNS.map((col) => {
            const isCurrent = status === col.id;
            return (
              <button
                key={col.id}
                onClick={() => handleStatusChange(col.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  isCurrent
                    ? `${col.badgeBg} shadow-xs ring-1 ring-black/10`
                    : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {col.title}
              </button>
            );
          })}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-3 bg-white dark:bg-zinc-900 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center justify-center gap-1.5 py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors shrink-0 ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex items-center justify-center gap-1.5 py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors shrink-0 ${
              activeTab === "notes"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Notes ({lead?.notes?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("reminders")}
            className={`flex items-center justify-center gap-1.5 py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors shrink-0 ${
              activeTab === "reminders"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Reminders ({lead?.reminders?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("files")}
            className={`flex items-center justify-center gap-1.5 py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors shrink-0 ${
              activeTab === "files"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Files ({lead?.files?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center justify-center gap-1.5 py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors shrink-0 ${
              activeTab === "activity"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Activity</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* TAB 1: OVERVIEW & PROFILE EDIT */}
          {activeTab === "overview" && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Driver Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* State Location */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Home State / Location
                  </label>
                  <input
                    type="text"
                    value={locationState}
                    onChange={(e) => setLocationState(e.target.value.toUpperCase())}
                    placeholder="e.g. TX, OH, FL"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100 uppercase"
                  />
                </div>

                {/* Lead Source */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Acquisition Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    {Object.entries(SOURCE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source Details */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Source Details / Referrer / Campaign
                  </label>
                  <input
                    type="text"
                    value={sourceDetails}
                    onChange={(e) => setSourceDetails(e.target.value)}
                    placeholder="e.g. FB Ad #2, Referred by John D."
                    className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* CDL Class */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    CDL Class
                  </label>
                  <select
                    value={cdlType}
                    onChange={(e) => setCdlType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    {Object.entries(CDL_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Experience Years */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Route / Driver Preference */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Driver / Route Type
                  </label>
                  <select
                    value={driverType}
                    onChange={(e) => setDriverType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="OTR">OTR (Over The Road)</option>
                    <option value="Regional">Regional</option>
                    <option value="Local">Local Dedicated</option>
                    <option value="Lease Purchase">Lease Purchase</option>
                    <option value="Owner-Operator">Owner-Operator</option>
                    <option value="Team Driving">Team Driving</option>
                  </select>
                </div>

                {/* Desired Pay */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Desired Pay / Target Rate
                  </label>
                  <input
                    type="text"
                    value={desiredPay}
                    onChange={(e) => setDesiredPay(e.target.value)}
                    placeholder="e.g. $0.75 CPM or $2,200/wk"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Assigned Recruiter */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Assigned Recruiter
                  </label>
                  <select
                    value={assignedToId}
                    onChange={(e) => setAssignedToId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="">Unassigned</option>
                    {recruiters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Endorsements Checklist */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Endorsements & Driver Qualifications
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_ENDORSEMENTS.map((item) => {
                    const isChecked = selectedEndorsements.includes(item);
                    return (
                      <button
                        type="button"
                        key={item}
                        onClick={() => toggleEndorsement(item)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all text-left ${
                          isChecked
                            ? "bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-300"
                            : "bg-zinc-50 border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "border-zinc-300 dark:border-zinc-600"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary Bio / Notes */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Primary Driver Notes / Summary Bio
                </label>
                <textarea
                  rows={2}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  placeholder="Key background notes, schedule availability, reasons for leaving current company..."
                  className="w-full px-3 py-2 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:outline-none text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleDeleteLead}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete Lead
                </button>

                <div className="flex items-center gap-2">
                  {profileSavedSuccess && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Saved!
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: MULTI-NOTES FEED */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              {/* Add Note Card */}
              <form
                onSubmit={handleAddNote}
                className="bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Add Note
                  </span>
                  <select
                    value={newNoteTag}
                    onChange={(e) => setNewNoteTag(e.target.value)}
                    className="text-xs font-semibold px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                  >
                    {COMMON_NOTE_TAGS.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  rows={3}
                  required
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Type note details (e.g. Spoke with driver, needs 2 days off every other weekend, clean record...)"
                  className="w-full p-2.5 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-zinc-900 dark:text-zinc-100"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
                      Quick tags:
                    </span>
                    {["Left VM", "Interested", "Pay issue", "MVR Clean"].map((q) => (
                      <button
                        type="button"
                        key={q}
                        onClick={() => setNewNoteTag(q)}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingNote || !newNoteContent.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isSubmittingNote ? "Adding..." : "Post Note"}
                  </button>
                </div>
              </form>

              {/* Notes List */}
              <div className="space-y-3">
                {lead?.notes && lead.notes.length > 0 ? (
                  lead.notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white">
                            {note.author?.name ? note.author.name.charAt(0) : "R"}
                          </div>
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {note.author?.name || "Recruiter"}
                          </span>
                          {note.tag && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                              {note.tag}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-300">
                            {formatDate(note.createdAt)}
                          </span>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            title="Delete note"
                            className="p-1 rounded text-zinc-300 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed whitespace-pre-line pl-7">
                        {note.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-zinc-400">
                    <p className="text-xs font-semibold">No notes logged yet.</p>
                    <p className="text-[11px] mt-0.5">
                      Use the box above to log your calls and driver conversations.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: REMINDERS & FOLLOW-UPS */}
          {activeTab === "reminders" && (
            <div className="space-y-4">
              {/* Create Reminder Card */}
              <form
                onSubmit={handleAddReminder}
                className="bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Schedule Follow-up Reminder
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                    Reminder Title / Action *
                  </label>
                  <input
                    type="text"
                    required
                    value={newReminderTitle}
                    onChange={(e) => setNewReminderTitle(e.target.value)}
                    placeholder="e.g. Call Marcus back about orientation travel packet"
                    className="w-full p-2.5 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      required
                      min={(() => {
                        const now = new Date();
                        const yyyy = now.getFullYear();
                        const mm = String(now.getMonth() + 1).padStart(2, "0");
                        const dd = String(now.getDate()).padStart(2, "0");
                        return `${yyyy}-${mm}-${dd}`;
                      })()}
                      value={newReminderDate}
                      onChange={(e) => setNewReminderDate(e.target.value)}
                      className="w-full p-2 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                      Due Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      className={`w-full p-2 rounded-xl text-xs bg-white dark:bg-zinc-900 border text-zinc-900 dark:text-zinc-100 font-medium ${
                        newReminderDate &&
                        newReminderTime &&
                        new Date(`${newReminderDate}T${newReminderTime}:00`).getTime() < Date.now() - 60000
                          ? "border-red-500 focus:ring-red-400"
                          : "border-zinc-200 dark:border-zinc-700"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                      Advance Alert Window
                    </label>
                    <select
                      value={newReminderAdvance}
                      onChange={(e) => setNewReminderAdvance(Number(e.target.value))}
                      className="w-full p-2 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold"
                    >
                      <option value={0}>At time of event (0m)</option>
                      <option value={15}>15 minutes prior</option>
                      <option value={30}>30 minutes prior</option>
                      <option value={60}>1 hour prior</option>
                      <option value={120}>2 hours prior</option>
                      <option value={1440}>1 day prior</option>
                    </select>
                  </div>
                </div>

                {newReminderDate &&
                  newReminderTime &&
                  new Date(`${newReminderDate}T${newReminderTime}:00`).getTime() < Date.now() - 60000 && (
                    <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-2 text-xs font-bold text-red-600 animate-in fade-in">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                      <span>Reminder time cannot be in the past. Please select a future time.</span>
                    </div>
                  )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-zinc-500">Priority:</span>
                    {(["NORMAL", "HIGH", "URGENT"] as const).map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setNewReminderPriority(p)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          newReminderPriority === p
                            ? p === "URGENT"
                              ? "bg-red-600 text-white"
                              : p === "HIGH"
                              ? "bg-amber-600 text-white"
                              : "bg-blue-600 text-white"
                            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isSubmittingReminder ||
                      !newReminderTitle.trim() ||
                      (Boolean(newReminderDate) &&
                        Boolean(newReminderTime) &&
                        new Date(`${newReminderDate}T${newReminderTime}:00`).getTime() < Date.now() - 60000)
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isSubmittingReminder ? "Scheduling..." : "Set Reminder"}
                  </button>
                </div>
              </form>

              {/* Reminders List with Bulk Actions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 pb-0.5">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Active & Upcoming Follow-ups ({lead?.reminders?.length || 0})
                  </h4>

                  {lead?.reminders && lead.reminders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleSelectAllReminders(lead.reminders!)}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {lead.reminders.length > 0 &&
                      lead.reminders.every((r) => selectedReminderIds.includes(r.id))
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  )}
                </div>

                {/* Bulk Action Bar */}
                {selectedReminderIds.length > 0 && (
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 shadow-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                        {selectedReminderIds.length} follow-up{selectedReminderIds.length > 1 ? "s" : ""} selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedReminderIds([])}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDeleteReminders}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-xs transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete ({selectedReminderIds.length})
                      </button>
                    </div>
                  </div>
                )}

                {lead?.reminders && lead.reminders.length > 0 ? (
                  lead.reminders.map((rem) => {
                    const isSelected = selectedReminderIds.includes(rem.id);
                    const alert = isReminderAlerting(rem.dueAt, rem.advanceMinutes);

                    return (
                      <div
                        key={rem.id}
                        className={`p-3 rounded-2xl border transition-all ${
                          isSelected
                            ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-xs"
                            : rem.isCompleted
                            ? "bg-zinc-50/80 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 opacity-60"
                            : alert.isOverdue
                            ? "bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/60"
                            : alert.isDueSoon
                            ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60"
                            : "bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            {/* Multi-select Checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleSelectReminder(rem.id)}
                              className="mt-0.5 text-zinc-400 hover:text-blue-600 transition-colors shrink-0"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>

                            {/* Mark Complete Checkmark */}
                            <button
                              onClick={() => handleToggleReminderComplete(rem.id, rem.isCompleted)}
                              title={rem.isCompleted ? "Mark active" : "Mark completed"}
                              className={`mt-0.5 p-1 rounded-lg transition-colors shrink-0 ${
                                rem.isCompleted
                                  ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50"
                                  : "text-zinc-300 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>

                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-xs font-bold ${
                                  rem.isCompleted
                                    ? "line-through text-zinc-400"
                                    : "text-zinc-900 dark:text-zinc-100"
                                }`}
                              >
                                {rem.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap">
                                <span
                                  className={`font-semibold ${
                                    rem.isCompleted
                                      ? "text-zinc-400"
                                      : alert.isOverdue
                                      ? "text-red-600 dark:text-red-400 font-bold"
                                      : alert.isDueSoon
                                      ? "text-amber-600 dark:text-amber-400 font-bold"
                                      : "text-zinc-500"
                                  }`}
                                >
                                  {formatDate(rem.dueAt)} ({alert.alertText})
                                </span>
                                {rem.advanceMinutes > 0 ? (
                                  <span className="text-zinc-600 dark:text-zinc-300">
                                    • {rem.advanceMinutes}m advance alert
                                  </span>
                                ) : (
                                  <span className="text-zinc-400 dark:text-zinc-500">
                                    • At time of event (0m)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {!rem.isCompleted && (
                              <>
                                <button
                                  onClick={() => handleSnoozeReminder(rem.id, 15)}
                                  title="Snooze 15 minutes"
                                  className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                                >
                                  +15m
                                </button>
                                <button
                                  onClick={() => handleSnoozeReminder(rem.id, 60)}
                                  title="Snooze 1 hour"
                                  className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                                >
                                  +1h
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteReminder(rem.id)}
                              title="Delete reminder"
                              className="p-1 rounded text-zinc-300 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-zinc-400">
                    <p className="text-xs font-semibold">No follow-ups scheduled.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3.5: FILES & DOCUMENTS */}
          {activeTab === "files" && (
            <div className="space-y-5">
              {/* UPLOAD FORM WITH DRAG & DROP */}
              <form
                onSubmit={handleUploadFile}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 space-y-3.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-blue-600" />
                    Attach Driver Document
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400">
                    PDF, Images, DOCX (Max 25MB)
                  </span>
                </div>

                {/* DRAG AND DROP ZONE */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      addFilesToUpload(Array.from(e.dataTransfer.files));
                    }
                  }}
                  onClick={() => {
                    const el = document.getElementById("lead-file-input");
                    if (el) el.click();
                  }}
                  className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                    isDraggingOver
                      ? "border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 scale-[1.01]"
                      : filesToUpload.length > 0
                      ? "border-blue-300 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/10"
                      : "border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-600 bg-white dark:bg-zinc-900"
                  }`}
                >
                  <input
                    id="lead-file-input"
                    type="file"
                    multiple
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.csv,.xlsx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        addFilesToUpload(Array.from(e.target.files));
                        e.target.value = "";
                      }
                    }}
                  />

                  {filesToUpload.length > 0 ? (
                    <div className="w-full space-y-2 text-left" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                          {filesToUpload.length} file{filesToUpload.length > 1 ? "s" : ""} selected (
                          {(
                            filesToUpload.reduce((acc, f) => acc + f.size, 0) /
                            (1024 * 1024)
                          ).toFixed(2)}{" "}
                          MB total)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById("lead-file-input");
                            if (el) el.click();
                          }}
                          className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          + Add more
                        </button>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {filesToUpload.map((file, idx) => (
                          <div
                            key={`${file.name}_${idx}`}
                            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-zinc-800 border border-blue-200 dark:border-blue-800 shadow-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-blue-600 shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[220px]">
                                  {file.name}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-medium">
                                  {(file.size / 1024).toFixed(0)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeStagedFile(idx)}
                              title="Remove file"
                              className="p-1 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-transform ${
                          isDraggingOver
                            ? "bg-blue-600 text-white scale-110"
                            : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {isDraggingOver
                            ? "Drop files here to attach"
                            : "Drag & drop multiple documents here, or click to browse"}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Select multiple files: CDLs, DOT medical cards, MVRs, and applications (up to 25MB each)
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Category Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                      Document Type *
                    </label>
                    <select
                      value={fileType}
                      onChange={(e) => setFileType(e.target.value)}
                      className="w-full p-2 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CDL_FRONT">🪪 CDL Front Copy</option>
                      <option value="CDL_BACK">🪪 CDL Back Copy</option>
                      <option value="MED_CARD">🩺 DOT Medical Card</option>
                      <option value="MVR_REPORT">📋 MVR / Driving Record</option>
                      <option value="RESUME">📄 Resume / Work History</option>
                      <option value="SSN_CARD">🪪 SSN / ID Document</option>
                      <option value="DRUG_TEST">🧪 Drug Test / Clearinghouse</option>
                      <option value="APPLICATION">✍️ Signed Application</option>
                      <option value="OTHER">📁 Other Document</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isUploadingFile || filesToUpload.length === 0}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {isUploadingFile ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Uploading {filesToUpload.length} File{filesToUpload.length > 1 ? "s" : ""}...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>
                            Upload {filesToUpload.length > 0 ? `${filesToUpload.length} Document${filesToUpload.length > 1 ? "s" : ""}` : "Documents"}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* FILTER & SELECTION BAR */}
              {(() => {
                const filteredFiles = (lead?.files || []).filter((file) => {
                  if (fileCategoryFilter === "ALL") return true;
                  if (fileCategoryFilter === "CDL")
                    return file.fileType === "CDL_FRONT" || file.fileType === "CDL_BACK";
                  return file.fileType === fileCategoryFilter;
                });

                return (
                  <>
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                      <div className="flex items-center gap-2">
                        {filteredFiles.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleSelectAllFiles(filteredFiles)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {filteredFiles.length > 0 &&
                            filteredFiles.every((f) => selectedFileIds.includes(f.id)) ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-400" />
                            )}
                            <span>
                              {filteredFiles.length > 0 &&
                              filteredFiles.every((f) => selectedFileIds.includes(f.id))
                                ? "Deselect All"
                                : "Select All"}
                            </span>
                          </button>
                        )}
                        <span className="text-xs text-zinc-400 font-semibold">
                          ({lead?.files?.length || 0} document{lead?.files?.length === 1 ? "" : "s"})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { id: "ALL", label: "All" },
                          { id: "CDL", label: "CDL" },
                          { id: "MED_CARD", label: "Med Card" },
                          { id: "MVR_REPORT", label: "MVR" },
                          { id: "OTHER", label: "Other" },
                        ].map((f) => {
                          const isSelected = fileCategoryFilter === f.id;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setFileCategoryFilter(f.id)}
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-colors ${
                                isSelected
                                  ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200"
                              }`}
                            >
                              {f.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* BULK ACTION BAR */}
                    {selectedFileIds.length > 0 && (
                      <div className="p-3 rounded-2xl bg-blue-50/90 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                            {selectedFileIds.length}
                          </div>
                          <span className="text-xs font-bold text-blue-950 dark:text-blue-100">
                            {selectedFileIds.length} document
                            {selectedFileIds.length > 1 ? "s" : ""} selected
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedFileIds([])}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleBulkDeleteFiles}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/20 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Selected ({selectedFileIds.length})</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* FILES LIST */}
                    <div className="space-y-3">
                      {filteredFiles.length > 0 ? (
                        filteredFiles.map((file) => {
                          const isSelected = selectedFileIds.includes(file.id);
                          const categoryInfo =
                            FILE_CATEGORY_CONFIG[file.fileType] || FILE_CATEGORY_CONFIG.OTHER;
                          const isImage =
                            file.mimeType?.startsWith("image/") ||
                            file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                          const isPdf =
                            file.mimeType === "application/pdf" || file.name.match(/\.pdf$/i);

                          const formattedSize = file.fileSize
                            ? file.fileSize > 1024 * 1024
                              ? `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`
                              : `${(file.fileSize / 1024).toFixed(0)} KB`
                            : "Unknown size";

                          return (
                            <div
                              key={file.id}
                              className={`p-3.5 rounded-2xl border shadow-xs flex items-center justify-between gap-3 transition-colors ${
                                isSelected
                                  ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800"
                                  : "bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {/* Checkbox */}
                                <button
                                  type="button"
                                  onClick={() => toggleSelectFile(file.id)}
                                  className="text-zinc-400 hover:text-blue-600 transition-colors shrink-0"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>

                                <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300">
                                  {isPdf ? (
                                    <FileText className="w-5 h-5 text-red-600" />
                                  ) : isImage ? (
                                    <Eye className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <Paperclip className="w-5 h-5 text-zinc-500" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[220px]">
                                      {file.name}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${categoryInfo.badge}`}
                                    >
                                      {categoryInfo.label}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1">
                                    <span>{formattedSize}</span>
                                    <span>•</span>
                                    <span>{formatDate(file.createdAt)}</span>
                                    {file.uploader && (
                                      <>
                                        <span>•</span>
                                        <span>By {file.uploader.name}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {/* Open / Preview in new tab */}
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Open / View Document"
                                  className="p-2 rounded-xl text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                >
                                  <ArrowUpRight className="w-4 h-4" />
                                </a>

                                {/* Direct Forced Download */}
                                <button
                                  type="button"
                                  onClick={() => handleDownloadFile(file.fileUrl, file.name)}
                                  title="Download File"
                                  className="p-2 rounded-xl text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                </button>

                                {/* Delete File */}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteFile(file.id, file.name)}
                                  title="Delete File"
                                  className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-12 text-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
                          <FolderArchive className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
                          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            No documents attached yet
                          </p>
                          <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                            Attach CDL copies, DOT medical cards, MVR reports, or signed
                            applications above.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 4: ACTIVITY & STATUS HISTORY */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              {/* Header & Filter Chips */}
              <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Activity Timeline
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {lead?.activityLogs?.length || 0} events
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "ALL", label: "All" },
                    { id: "STATUS", label: "Stages" },
                    { id: "NOTES", label: "Notes" },
                    { id: "REMINDERS", label: "Reminders" },
                    { id: "FILES", label: "Files" },
                  ].map((filter) => {
                    const isSelected = activityFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setActivityFilter(filter.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          isSelected
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TIMELINE STREAM */}
              {(() => {
                const logs = (lead?.activityLogs || []).filter((log) => {
                  if (activityFilter === "ALL") return true;
                  if (activityFilter === "STATUS")
                    return log.action.includes("STATUS");
                  if (activityFilter === "NOTES")
                    return log.action.includes("NOTE");
                  if (activityFilter === "REMINDERS")
                    return log.action.includes("REMINDER");
                  if (activityFilter === "FILES")
                    return log.action.includes("FILE");
                  return true;
                });

                if (logs.length === 0) {
                  return (
                    <div className="py-12 text-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
                      <History className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        No activity found
                      </p>
                      <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                        Status transitions, notes, follow-up reminders, and document uploads will be tracked here.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
                    {logs.map((log) => {
                      // Activity visual styling helper
                      let IconComponent = ShieldCheck;
                      let iconBg = "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300";
                      let badgeStyle = "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700";
                      let displayAction = log.action.replace(/_/g, " ");

                      if (log.action.includes("STATUS")) {
                        IconComponent = RefreshCw;
                        iconBg = "bg-blue-100 dark:bg-blue-950/90 text-blue-600 dark:text-blue-400";
                        badgeStyle = "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
                        displayAction = "Stage Moved";
                      } else if (log.action.includes("NOTE")) {
                        IconComponent = MessageSquare;
                        iconBg = "bg-indigo-100 dark:bg-indigo-950/90 text-indigo-600 dark:text-indigo-400";
                        badgeStyle = "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
                        displayAction = "Note Logged";
                      } else if (log.action.includes("REMINDER_COMPLETED")) {
                        IconComponent = CheckCircle2;
                        iconBg = "bg-emerald-100 dark:bg-emerald-950/90 text-emerald-600 dark:text-emerald-400";
                        badgeStyle = "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
                        displayAction = "Follow-up Done";
                      } else if (log.action.includes("REMINDER")) {
                        IconComponent = Clock;
                        iconBg = "bg-amber-100 dark:bg-amber-950/90 text-amber-600 dark:text-amber-400";
                        badgeStyle = "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
                        displayAction = "Reminder Set";
                      } else if (log.action.includes("FILE_UPLOADED")) {
                        IconComponent = UploadCloud;
                        iconBg = "bg-teal-100 dark:bg-teal-950/90 text-teal-600 dark:text-teal-400";
                        badgeStyle = "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800";
                        displayAction = "Document Attached";
                      } else if (log.action.includes("FILE") || log.action.includes("DELETED")) {
                        IconComponent = Trash2;
                        iconBg = "bg-red-100 dark:bg-red-950/90 text-red-600 dark:text-red-400";
                        badgeStyle = "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800";
                        displayAction = log.action.includes("BULK") ? "Bulk Files Removed" : "File Removed";
                      } else if (log.action.includes("LEAD_CREATED")) {
                        IconComponent = Sparkles;
                        iconBg = "bg-purple-100 dark:bg-purple-950/90 text-purple-600 dark:text-purple-400";
                        badgeStyle = "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800";
                        displayAction = "Lead Created";
                      }

                      // Stage transition parse
                      const stageMatch = log.details.match(/from\s+([A-Z_]+)\s+to\s+([A-Z_]+)/i);

                      // Note parse
                      const noteMatch = log.details.match(/^Note added\s+\[(.*?)\]:\s*(.*)$/);

                      return (
                        <div key={log.id} className="relative group">
                          {/* Timeline node icon */}
                          <div
                            className={`absolute -left-[30px] top-3 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-zinc-900 shadow-xs z-10 ${iconBg}`}
                          >
                            <IconComponent className="w-3 h-3" />
                          </div>

                          {/* Event Card */}
                          <div className="p-3.5 rounded-2xl bg-zinc-50/90 dark:bg-zinc-800/70 border border-zinc-200/90 dark:border-zinc-700/80 shadow-xs hover:shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 transition-all space-y-2">
                            {/* Card Top: Action badge + Date & Time */}
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeStyle}`}
                              >
                                {displayAction}
                              </span>
                              <span
                                className="text-[11px] font-semibold text-zinc-400"
                                title={formatDate(log.createdAt)}
                              >
                                {formatRelativeTime(log.createdAt)}
                              </span>
                            </div>

                            {/* Card Content */}
                            {stageMatch ? (
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <span className="text-xs text-zinc-500 font-medium">Moved from</span>
                                <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                  {PIPELINE_COLUMNS.find((c) => c.id === stageMatch[1])?.title ||
                                    stageMatch[1].replace(/_/g, " ")}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  {PIPELINE_COLUMNS.find((c) => c.id === stageMatch[2])?.title ||
                                    stageMatch[2].replace(/_/g, " ")}
                                </span>
                              </div>
                            ) : noteMatch ? (
                              <div className="space-y-1 pt-0.5">
                                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  {noteMatch[1]}
                                </span>
                                <p className="text-xs text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 leading-relaxed italic">
                                  &ldquo;{noteMatch[2]}&rdquo;
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200 leading-relaxed pt-0.5">
                                {log.details}
                              </p>
                            )}

                            {/* Card Footer: User Attribution */}
                            {log.userName && (
                              <div className="flex items-center gap-1.5 pt-1.5 border-t border-zinc-200/60 dark:border-zinc-700/50 text-[11px] text-zinc-400 font-medium">
                                <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[9px] font-bold text-zinc-600 dark:text-zinc-300">
                                  {log.userName.charAt(0).toUpperCase()}
                                </div>
                                <span>By <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{log.userName}</strong></span>
                                <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                <span className="text-[10px] text-zinc-400">{formatDate(log.createdAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Reusable Custom Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        isLoading={isModalLoading}
      />
    </div>
  );
}
