"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  CheckSquare,
  Square,
  FileText,
  Truck,
  Phone,
  Radio,
  Users,
  MessageSquare,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Lead } from "@/types";
import { toast } from "sonner";

interface TelegramDestination {
  id: string;
  chatId: string;
  title: string;
  type: string;
  isDefault: boolean;
  isActive: boolean;
}

interface ShareToTelegramModalProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onOpenIntegrations?: () => void;
}

export function ShareToTelegramModal({
  isOpen,
  lead,
  onClose,
  onOpenIntegrations,
}: ShareToTelegramModalProps) {
  const [destinations, setDestinations] = useState<TelegramDestination[]>([]);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [includeFiles, setIncludeFiles] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDestinations();
    }
  }, [isOpen]);

  const fetchDestinations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/telegram/integrations");
      if (res.ok) {
        const data = await res.json();
        const active = (data.integrations || []).filter(
          (i: TelegramDestination) => i.isActive
        );
        setDestinations(active);

        // Pre-select default destination, or all if only 1
        const def = active.find((i: TelegramDestination) => i.isDefault);
        if (def) {
          setSelectedChatIds([def.chatId]);
        } else if (active.length > 0) {
          setSelectedChatIds([active[0].chatId]);
        }
      }
    } catch {
      toast.error("Failed to load Telegram destinations");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectChat = (chatId: string) => {
    setSelectedChatIds((prev) =>
      prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleShare = async () => {
    if (!lead) return;
    if (selectedChatIds.length === 0) {
      toast.error("Please select at least one Telegram destination");
      return;
    }

    try {
      setIsSending(true);
      const res = await fetch("/api/telegram/share-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          chatIds: selectedChatIds,
          includeFiles,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Lead profile shared to ${data.sentCount} Telegram destination(s)`);
        onClose();
      } else {
        toast.error(data.error || "Failed to share lead to Telegram");
      }
    } catch {
      toast.error("Error sharing lead to Telegram");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !lead) return null;

  const filesCount = lead.files?.length || lead._count?.files || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-850/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                Share Driver Lead to Telegram
              </h3>
              <p className="text-[11px] text-zinc-500">
                Send lead profile summary & documents via @kargogroups_bot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Lead Summary Card Preview */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-zinc-900 dark:text-zinc-100">
                {lead.fullName}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                {lead.status.replace("_", " ")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-zinc-400" />
                <span>{lead.phone}</span>
              </div>
              <div className="flex items-center gap-1">
                <Truck className="w-3 h-3 text-zinc-400" />
                <span>{lead.cdlType.replace("_", " ")} • {lead.experienceYears}y</span>
              </div>
            </div>
          </div>

          {/* Destination Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span>Select Telegram Destination(s)</span>
              </label>
              {onOpenIntegrations && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenIntegrations();
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  + Manage Chats
                </button>
              )}
            </div>

            {destinations.length === 0 && !isLoading && (
              <div className="p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center space-y-2">
                <AlertCircle className="w-5 h-5 text-amber-500 mx-auto" />
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  No Telegram destinations connected yet
                </p>
                {onOpenIntegrations && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenIntegrations();
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Connect @kargogroups_bot
                  </button>
                )}
              </div>
            )}

            <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar">
              {destinations.map((dest) => {
                const isSelected = selectedChatIds.includes(dest.chatId);
                const typeIcons: Record<string, any> = {
                  private: MessageSquare,
                  group: Users,
                  supergroup: Users,
                  channel: Radio,
                };
                const IconComponent = typeIcons[dest.type] || MessageSquare;

                return (
                  <div
                    key={dest.id}
                    onClick={() => toggleSelectChat(dest.chatId)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500/20"
                        : "border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button className="text-zinc-400">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <IconComponent className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate block">
                          {dest.title}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {dest.type.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {dest.isDefault && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
                        Default
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Files Checkbox */}
          {filesCount > 0 && (
            <div
              onClick={() => setIncludeFiles(!includeFiles)}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Attach Driver Documents ({filesCount} files)
                </span>
              </div>
              <button className="text-zinc-400">
                {includeFiles ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={isSending || selectedChatIds.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md shadow-blue-600/20 active:scale-98 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? "Sharing to Telegram..." : "Send to Telegram"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
