"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Volume2,
  VolumeX,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  RotateCcw,
  History,
  Check,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { playNotificationSound } from "../common/AudioAlert";
import {
  getNotificationPermission,
  requestNotificationPermission,
  triggerBrowserPushNotification,
  isPushNotificationSupported,
} from "@/lib/pushNotifications";
import { Reminder } from "@/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface NotificationCenterProps {
  onSelectLead: (leadId: string) => void;
  activeUserId?: string;
  refreshTrigger?: number;
}

export function NotificationCenter({
  onSelectLead,
  activeUserId,
  refreshTrigger,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushPermission, setPushPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");

  // Active / Due Reminders State
  const [data, setData] = useState<{
    totalAlerts: number;
    overdue: Reminder[];
    dueSoon: Reminder[];
    upcoming: Reminder[];
  }>({
    totalAlerts: 0,
    overdue: [],
    dueSoon: [],
    upcoming: [],
  });

  // History State
  const [historyReminders, setHistoryReminders] = useState<Reminder[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "COMPLETED" | "ACTIVE">("ALL");
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const notifiedReminderIds = useRef<Set<string>>(new Set());
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize permissions & preferences
  useEffect(() => {
    setPushPermission(getNotificationPermission());
    const storedSound = localStorage.getItem("leads_sound_enabled");
    if (storedSound !== null) {
      setSoundEnabled(storedSound === "true");
    }
  }, []);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("leads_sound_enabled", String(next));
    if (next) playNotificationSound();
  };

  const handleEnablePush = async () => {
    const perm = await requestNotificationPermission();
    setPushPermission(perm);
    if (perm === "granted") {
      toast.success("Desktop & Push Notifications enabled!");
      triggerBrowserPushNotification({
        title: "Leads Center Notifications Active",
        body: "You will receive real-time alerts when follow-ups are due.",
      });
    } else if (perm === "denied") {
      toast.error(
        "Notifications blocked in browser. Please enable permissions in your browser address bar."
      );
    }
  };

  // Complete reminder
  const handleComplete = async (reminderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: true }),
      });
      if (res.ok) {
        toast.success("Reminder marked completed!");
        fetchDueReminders();
        if (activeTab === "history") fetchHistory(historyPage, historyFilter);
      }
    } catch (err) {
      console.error("Failed to complete reminder:", err);
    }
  };

  // Reopen completed reminder
  const handleReopen = async (reminderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: false }),
      });
      if (res.ok) {
        toast.success("Reminder reopened!");
        fetchDueReminders();
        fetchHistory(historyPage, historyFilter);
      }
    } catch (err) {
      console.error("Failed to reopen reminder:", err);
    }
  };

  // Snooze reminder
  const handleSnooze = async (
    reminderId: string,
    minutes: number,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/reminders/${reminderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snoozeMinutes: minutes }),
      });
      if (res.ok) {
        toast.info(`Reminder snoozed for ${minutes} minutes`);
        fetchDueReminders();
        if (activeTab === "history") fetchHistory(historyPage, historyFilter);
      }
    } catch (err) {
      console.error("Failed to snooze reminder:", err);
    }
  };

  // Main polling & notification dispatcher
  const fetchDueReminders = useCallback(async () => {
    try {
      const url = activeUserId
        ? `/api/reminders/due?userId=${activeUserId}`
        : `/api/reminders/due`;
      const res = await fetch(url);
      if (!res.ok) return;

      const json = await res.json();
      setData(json);

      const activeAlerts: Reminder[] = [...json.overdue, ...json.dueSoon];
      const newlyFired = activeAlerts.filter((r) => !notifiedReminderIds.current.has(r.id));

      if (newlyFired.length > 0 && soundEnabled) {
        playNotificationSound();
      }

      newlyFired.forEach((r) => {
        notifiedReminderIds.current.add(r.id);

        const driverName = r.lead?.fullName || "Driver Lead";
        const alertType = json.overdue.some((o: Reminder) => o.id === r.id)
          ? "OVERDUE"
          : "DUE SOON";

        // 1. Trigger Browser System Push Notification
        triggerBrowserPushNotification({
          title: `${alertType === "OVERDUE" ? "Overdue" : "Due Soon"}: ${driverName}`,
          body: `${r.title} ${r.lead?.phone ? `(${r.lead.phone})` : ""}`,
          tag: `reminder-${r.id}`,
          leadId: r.leadId,
          onClick: () => onSelectLead(r.leadId),
        });

        // 2. Trigger Rich In-App Sonner Interactive Banner
        toast(
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    alertType === "OVERDUE" ? "bg-red-500" : "bg-amber-500"
                  } animate-pulse`}
                />
                {driverName}
              </span>
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                {r.lead?.phone || ""}
              </span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
              {r.title}
            </p>

            <div className="flex items-center gap-1.5 pt-1 mt-1 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => onSelectLead(r.leadId)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Open Lead
              </button>
              <button
                onClick={() => handleSnooze(r.id, 15)}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition-colors"
              >
                +15m
              </button>
              <button
                onClick={() => handleComplete(r.id)}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 transition-colors ml-auto"
              >
                Done
              </button>
            </div>
          </div>,
          {
            id: `toast-reminder-${r.id}`,
            duration: 8000,
          }
        );
      });
    } catch (err) {
      console.error("Failed to fetch due reminders:", err);
    }
  }, [activeUserId, onSelectLead, soundEnabled]);

  // Fetch reminder history with pagination
  const fetchHistory = useCallback(
    async (page = 1, filter = historyFilter) => {
      setIsHistoryLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "5",
          status: filter,
        });
        if (activeUserId) params.append("userId", activeUserId);

        const res = await fetch(`/api/reminders?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          setHistoryReminders(json.reminders || []);
          setHistoryPage(json.page || 1);
          setHistoryTotalPages(json.totalPages || 1);
          setHistoryTotal(json.total || 0);
        }
      } catch (err) {
        console.error("Failed to fetch reminder history:", err);
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [activeUserId, historyFilter]
  );

  useEffect(() => {
    fetchDueReminders();
    const interval = setInterval(fetchDueReminders, 25000);
    return () => clearInterval(interval);
  }, [fetchDueReminders, refreshTrigger]);

  useEffect(() => {
    if (isOpen && activeTab === "history") {
      fetchHistory(historyPage, historyFilter);
    }
  }, [isOpen, activeTab, fetchHistory, historyPage, historyFilter]);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const hasUrgent = data.overdue.length > 0;
  const hasDueSoon = data.dueSoon.length > 0;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Notification Bell Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open notifications"
        className={`relative p-2.5 rounded-xl border transition-all duration-200 ${
          hasUrgent
            ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800 animate-pulse hover:bg-red-100"
            : hasDueSoon
            ? "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 hover:bg-amber-100"
            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`}
      >
        <Bell className="w-5 h-5" />
        {data.totalAlerts > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-bold text-white shadow-sm ${
              hasUrgent ? "bg-red-600" : "bg-amber-600"
            }`}
          >
            {data.totalAlerts}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[420px] sm:w-[460px] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Reminder Notifications
              </span>
              {data.totalAlerts > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                  {data.totalAlerts} alert{data.totalAlerts > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleSound}
                title={soundEnabled ? "Mute chime sound" : "Enable chime sound"}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  soundEnabled
                    ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Active vs History) */}
          <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 pt-2 gap-2">
            <button
              onClick={() => setActiveTab("active")}
              className={`pb-2 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                activeTab === "active"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Due / Active</span>
              {data.totalAlerts > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                  {data.totalAlerts}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("history");
                fetchHistory(1, historyFilter);
              }}
              className={`pb-2 px-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>All History</span>
              {historyTotal > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {historyTotal}
                </span>
              )}
            </button>
          </div>

          {/* Browser Push Permission Promo / Status Banner */}
          {pushPermission !== "granted" && isPushNotificationSupported() && activeTab === "active" && (
            <div className="p-3 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                  Enable Desktop Push Alerts
                </span>
              </div>
              <button
                onClick={handleEnablePush}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
              >
                Allow
              </button>
            </div>
          )}

          {/* TAB 1: ACTIVE & DUE REMINDERS */}
          {activeTab === "active" && (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 custom-scrollbar">
              {data.totalAlerts === 0 && data.upcoming.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <div className="mx-auto w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    All caught up!
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    No overdue or immediate follow-ups due.
                  </p>
                </div>
              ) : null}

              {/* Overdue Section */}
              {data.overdue.length > 0 && (
                <div className="p-2 bg-red-50/40 dark:bg-red-950/20">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-red-600 uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Overdue Follow-ups ({data.overdue.length})
                  </div>
                  <div className="space-y-1.5 mt-1">
                    {data.overdue.map((item) => (
                      <ReminderNotificationCard
                        key={item.id}
                        item={item}
                        type="overdue"
                        onSelect={() => {
                          onSelectLead(item.leadId);
                          setIsOpen(false);
                        }}
                        onComplete={(e) => handleComplete(item.id, e)}
                        onSnooze={(mins, e) => handleSnooze(item.id, mins, e)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Due Soon Section */}
              {data.dueSoon.length > 0 && (
                <div className="p-2 bg-amber-50/40 dark:bg-amber-950/20">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-amber-600 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" />
                    Due Soon ({data.dueSoon.length})
                  </div>
                  <div className="space-y-1.5 mt-1">
                    {data.dueSoon.map((item) => (
                      <ReminderNotificationCard
                        key={item.id}
                        item={item}
                        type="dueSoon"
                        onSelect={() => {
                          onSelectLead(item.leadId);
                          setIsOpen(false);
                        }}
                        onComplete={(e) => handleComplete(item.id, e)}
                        onSnooze={(mins, e) => handleSnooze(item.id, mins, e)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Section */}
              {data.upcoming.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" />
                    Upcoming Follow-ups ({data.upcoming.length})
                  </div>
                  <div className="space-y-1.5 mt-1">
                    {data.upcoming.map((item) => (
                      <ReminderNotificationCard
                        key={item.id}
                        item={item}
                        type="upcoming"
                        onSelect={() => {
                          onSelectLead(item.leadId);
                          setIsOpen(false);
                        }}
                        onComplete={(e) => handleComplete(item.id, e)}
                        onSnooze={(mins, e) => handleSnooze(item.id, mins, e)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REMINDER HISTORY (NEWEST TO OLDEST + PAGINATION) */}
          {activeTab === "history" && (
            <div className="flex flex-col">
              {/* History Sub-Filter Chips */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850">
                <span className="text-[11px] font-bold text-zinc-500 uppercase">
                  Sort: Newest First
                </span>

                <div className="flex items-center gap-1">
                  {(
                    [
                      { id: "ALL", label: "All" },
                      { id: "COMPLETED", label: "Completed" },
                      { id: "ACTIVE", label: "Active" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setHistoryFilter(f.id);
                        fetchHistory(1, f.id);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                        historyFilter === f.id
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* History Items Stream */}
              <div className="max-h-[360px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 custom-scrollbar p-2 space-y-1.5">
                {isHistoryLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-2">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-zinc-400 font-medium">Loading history...</p>
                  </div>
                ) : historyReminders.length === 0 ? (
                  <div className="py-10 text-center px-4">
                    <History className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      No reminder history found
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Scheduled follow-ups and completed actions will appear here in chronological order.
                    </p>
                  </div>
                ) : (
                  historyReminders.map((item) => {
                    const due = new Date(item.dueAt);
                    const isOverdue = !item.isCompleted && new Date() > due;

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onSelectLead(item.leadId);
                          setIsOpen(false);
                        }}
                        className={`group cursor-pointer rounded-xl p-3 border transition-all duration-150 ${
                          item.isCompleted
                            ? "bg-zinc-50/70 dark:bg-zinc-850/60 border-zinc-200/70 dark:border-zinc-800 hover:border-zinc-300"
                            : isOverdue
                            ? "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 hover:border-red-300 shadow-xs"
                            : "bg-white dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700/70 hover:border-blue-300 shadow-xs"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {item.lead?.fullName || "Driver Lead"}
                              </span>
                              {item.lead?.phone && (
                                <span className="text-[11px] text-zinc-500 font-medium">
                                  • {item.lead.phone}
                                </span>
                              )}
                              {item.lead?.locationState && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                                  {item.lead.locationState}
                                </span>
                              )}
                            </div>

                            <p
                              className={`text-xs font-semibold mt-1 leading-snug ${
                                item.isCompleted
                                  ? "line-through text-zinc-400 dark:text-zinc-500"
                                  : "text-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              {item.title}
                            </p>

                            <div className="flex items-center gap-2 mt-1.5 text-[11px] flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                  item.isCompleted
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                    : isOverdue
                                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800"
                                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                                }`}
                              >
                                {item.isCompleted ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Completed
                                  </>
                                ) : isOverdue ? (
                                  <>
                                    <AlertTriangle className="w-3 h-3" />
                                    Overdue
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3" />
                                    Active
                                  </>
                                )}
                              </span>

                              <span className="text-zinc-400 font-medium" title={formatDate(item.dueAt)}>
                                Due: {format(due, "MMM d, yyyy • h:mm a")}
                              </span>
                            </div>
                          </div>

                          {/* Quick Toggle Done / Reopen Action */}
                          <div className="flex items-center gap-1 shrink-0">
                            {item.isCompleted ? (
                              <button
                                onClick={(e) => handleReopen(item.id, e)}
                                title="Reopen Reminder (marked completed by mistake)"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Reopen
                              </button>
                            ) : (
                              <button
                                onClick={(e) => handleComplete(item.id, e)}
                                title="Mark Completed"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                Done
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Open Lead direct jump */}
                        <div className="mt-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-750 flex items-center justify-end text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                          <span>Open driver lead</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* History Pagination Footer */}
              {historyTotal > 0 && (
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-850 text-xs">
                  <span className="text-[11px] font-semibold text-zinc-500">
                    Showing {(historyPage - 1) * 5 + 1}–
                    {Math.min(historyPage * 5, historyTotal)} of {historyTotal}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={historyPage <= 1 || isHistoryLoading}
                      onClick={() => fetchHistory(historyPage - 1, historyFilter)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Prev
                    </button>
                    <span className="text-[11px] font-bold px-1 text-zinc-600 dark:text-zinc-400">
                      {historyPage} / {historyTotalPages}
                    </span>
                    <button
                      disabled={historyPage >= historyTotalPages || isHistoryLoading}
                      onClick={() => fetchHistory(historyPage + 1, historyFilter)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReminderNotificationCard({
  item,
  type,
  onSelect,
  onComplete,
  onSnooze,
}: {
  item: Reminder;
  type: "overdue" | "dueSoon" | "upcoming";
  onSelect: () => void;
  onComplete: (e: React.MouseEvent) => void;
  onSnooze: (mins: number, e: React.MouseEvent) => void;
}) {
  const due = new Date(item.dueAt);

  return (
    <div
      onClick={onSelect}
      className={`group cursor-pointer rounded-xl p-3 border transition-all duration-150 ${
        type === "overdue"
          ? "bg-white dark:bg-zinc-800/90 border-red-200 dark:border-red-900/50 hover:border-red-300 shadow-sm"
          : type === "dueSoon"
          ? "bg-white dark:bg-zinc-800/90 border-amber-200 dark:border-amber-900/50 hover:border-amber-300 shadow-sm"
          : "bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/60 hover:border-zinc-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
              {item.lead?.fullName || "Driver Lead"}
            </span>
            {item.lead?.phone && (
              <span className="text-[11px] text-zinc-500 font-medium">
                {item.lead.phone}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium mt-0.5 line-clamp-1">
            {item.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-[11px]">
            <span
              className={`font-bold ${
                type === "overdue"
                  ? "text-red-600 dark:text-red-400"
                  : type === "dueSoon"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {type === "overdue"
                ? `Overdue (${formatDistanceToNow(due, { addSuffix: true })})`
                : type === "dueSoon"
                ? `Due in ${formatDistanceToNow(due)} (${format(due, "h:mm a")})`
                : format(due, "MMM d, h:mm a")}
            </span>
            {item.advanceMinutes > 0 && (
              <span className="text-zinc-400">
                • {item.advanceMinutes}m advance notice
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onComplete}
          title="Mark Completed"
          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
      </div>

      {/* Snooze and Quick Action Bar */}
      <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-700/50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            Snooze:
          </span>
          <button
            onClick={(e) => onSnooze(15, e)}
            className="px-2 py-0.5 text-[10px] font-bold rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition-colors"
          >
            +15m
          </button>
          <button
            onClick={(e) => onSnooze(60, e)}
            className="px-2 py-0.5 text-[10px] font-bold rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition-colors"
          >
            +1h
          </button>
        </div>

        <div className="flex items-center text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
          Open lead <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </div>
      </div>
    </div>
  );
}
