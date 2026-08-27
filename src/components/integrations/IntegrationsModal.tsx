"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  Send,
  Check,
  Copy,
  ExternalLink,
  Users,
  MessageSquare,
  Radio,
  Trash2,
  Star,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Plus,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

interface TelegramDestination {
  id: string;
  chatId: string;
  title: string;
  type: string;
  username?: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrationsModal({ isOpen, onClose }: IntegrationsModalProps) {
  const [destinations, setDestinations] = useState<TelegramDestination[]>([]);
  const [botUsername, setBotUsername] = useState("kargogroups_bot");
  const [isLoading, setIsLoading] = useState(true);

  // Pairing code state
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Manual channel connect state
  const [channelInput, setChannelInput] = useState("");
  const [isConnectingChannel, setIsConnectingChannel] = useState(false);

  // Testing ping state
  const [pingingId, setPingingId] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDestinations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/telegram/integrations");
      if (res.ok) {
        const data = await res.json();
        setDestinations(data.integrations || []);
        if (data.botUsername) setBotUsername(data.botUsername);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load Telegram destinations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchDestinations();
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
  }, [isOpen, fetchDestinations]);

  // Generate a new 4-digit pairing code
  const handleGenerateCode = async () => {
    try {
      setIsGeneratingCode(true);
      const res = await fetch("/api/telegram/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_code" }),
      });

      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.code);
        setExpiresAt(new Date(data.expiresAt));

        // Start polling to detect when pairing is done
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(async () => {
          const checkRes = await fetch("/api/telegram/integrations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "check_code_paired", code: data.code }),
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.paired) {
              clearInterval(pollIntervalRef.current!);
              setPairingCode(null);
              toast.success("🎉 Telegram chat successfully connected!");
              fetchDestinations();
            }
          }
        }, 3000);
      } else {
        toast.error("Failed to generate pairing code");
      }
    } catch {
      toast.error("Failed to generate pairing code");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleManualChannelConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelInput.trim()) return;

    try {
      setIsConnectingChannel(true);
      const res = await fetch("/api/telegram/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_connect",
          channelIdentifier: channelInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Connected channel successfully!");
        setChannelInput("");
        fetchDestinations();
      } else {
        toast.error(data.error || "Failed to connect channel");
      }
    } catch {
      toast.error("Failed to connect channel");
    } finally {
      setIsConnectingChannel(false);
    }
  };

  const handleTestPing = async (chatId: string) => {
    try {
      setPingingId(chatId);
      const res = await fetch("/api/telegram/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_ping", chatId }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("✅ Test message delivered to Telegram!");
      } else {
        toast.error(data.error || "Failed to deliver test message");
      }
    } catch {
      toast.error("Failed to send test message");
    } finally {
      setPingingId(null);
    }
  };

  const handleToggleDefault = async (id: string, currentDefault: boolean) => {
    if (currentDefault) return;
    try {
      const res = await fetch("/api/telegram/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isDefault: true }),
      });
      if (res.ok) {
        toast.success("Set as default Telegram destination");
        fetchDestinations();
      }
    } catch {
      toast.error("Failed to update default");
    }
  };

  const handleDeleteDestination = async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/telegram/integrations?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Removed ${title}`);
        fetchDestinations();
      } else {
        toast.error("Failed to remove destination");
      }
    } catch {
      toast.error("Failed to remove destination");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-850/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Telegram Bot Integrations</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  @{botUsername}
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Connect Telegram private chats, recruiter groups, and broadcast channels.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Section 1: Connect New Chat via One-Time Code */}
          <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 p-4 sm:p-5 rounded-2xl border border-blue-200/60 dark:border-blue-900/40">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Connect a Chat or Group via One-Time Code</span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Send this pairing code to the bot to link your private chat, group, or channel.
                </p>
              </div>

              {!pairingCode && (
                <button
                  onClick={handleGenerateCode}
                  disabled={isGeneratingCode}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isGeneratingCode ? "Generating..." : "Generate Code"}</span>
                </button>
              )}
            </div>

            {pairingCode && (
              <div className="mt-3 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-blue-300 dark:border-blue-800 shadow-2xs space-y-3 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-blue-600 dark:text-blue-400 block">
                      Pairing Command
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl sm:text-2xl font-mono font-black text-zinc-900 dark:text-zinc-100">
                        /connect {pairingCode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(`/connect ${pairingCode}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "Copied" : "Copy"}</span>
                    </button>

                    <a
                      href={`https://t.me/${botUsername}?start=${pairingCode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Telegram</span>
                    </a>
                  </div>
                </div>

                {/* Instructions */}
                <div className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1 bg-zinc-50 dark:bg-zinc-850 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">How to connect:</p>
                  <p>• <b>Private:</b> Click &ldquo;Open Telegram&rdquo; above or send <code>/connect {pairingCode}</code> to @{botUsername}.</p>
                  <p>• <b>Group:</b> Add @{botUsername} to your group and send <code>/connect {pairingCode}</code>.</p>
                  <p>• <b>Channel:</b> Add @{botUsername} as an Administrator and post <code>/connect {pairingCode}</code>.</p>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Manual Public Channel Connection */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-purple-600" />
              <span>Connect Public Broadcast Channel</span>
            </h3>
            <p className="text-xs text-zinc-500">
              Ensure <b>@{botUsername}</b> is added as an Administrator to the channel before connecting.
            </p>
            <form onSubmit={handleManualChannelConnect} className="flex gap-2">
              <input
                type="text"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="@my_recruitment_channel or -100xxxxxxxx"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isConnectingChannel || !channelInput.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isConnectingChannel ? "Connecting..." : "Connect Channel"}
              </button>
            </form>
          </div>

          {/* Section 3: Connected Destinations List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Connected Destinations ({destinations.length})</span>
              </h3>
              <button
                onClick={fetchDestinations}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                title="Refresh list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {destinations.length === 0 && !isLoading && (
              <div className="p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-center">
                <Send className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  No Telegram destinations connected yet
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Generate a pairing code above to connect your first chat or group.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {destinations.map((dest) => {
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
                    className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                            {dest.title}
                          </h4>
                          {dest.isDefault && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          {dest.type.toUpperCase()} • ID: <code>{dest.chatId}</code>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Test Ping */}
                      <button
                        onClick={() => handleTestPing(dest.chatId)}
                        disabled={pingingId === dest.chatId}
                        className="px-2 py-1 text-[11px] font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                        title="Send test message to chat"
                      >
                        {pingingId === dest.chatId ? "Sending..." : "Test Ping"}
                      </button>

                      {/* Make Default */}
                      <button
                        onClick={() => handleToggleDefault(dest.id, dest.isDefault)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          dest.isDefault
                            ? "text-amber-500 bg-amber-50 dark:bg-amber-950/40"
                            : "text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                        title={dest.isDefault ? "Current Default" : "Set as Default"}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteDestination(dest.id, dest.title)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Disconnect Destination"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
