"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  LogOut,
  ChevronDown,
  Users,
  Kanban,
  BarChart3,
  Send,
} from "lucide-react";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { User } from "@/types";
import { toast } from "sonner";

interface HeaderProps {
  onOpenNewLead: () => void;
  onOpenTeamModal: () => void;
  onOpenIntegrationsModal?: () => void;
  onSelectLead: (leadId: string) => void;
  recruiters: User[];
  currentUser: User | null;
  onUserChange: (user: User) => void;
  refreshTrigger: number;
}

export function Header({
  onOpenNewLead,
  onOpenTeamModal,
  onOpenIntegrationsModal,
  onSelectLead,
  recruiters,
  currentUser,
  onUserChange,
  refreshTrigger,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Signed out successfully");
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Title & Navigation Tabs */}
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
              Leads Center
            </h1>
            <p className="text-[11px] text-zinc-500 font-medium">
              Truck Driver Recruitment & Pipeline Command
            </p>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
            <Link
              href="/"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === "/"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Pipeline</span>
            </Link>
            <Link
              href="/analytics"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === "/analytics"
                  ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </Link>
          </nav>
        </div>

        {/* Right Tools: Notification Bell, New Lead, User Profile Menu */}
        <div className="flex items-center gap-2.5">
          {/* Notification Bell */}
          <NotificationCenter
            onSelectLead={onSelectLead}
            activeUserId={currentUser?.id}
            refreshTrigger={refreshTrigger}
          />

          {/* New Driver Lead CTA */}
          <button
            onClick={onOpenNewLead}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-98 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Lead</span>
          </button>

          {/* Authenticated User Profile Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0">
                {currentUser?.name ? currentUser.name.charAt(0) : "R"}
              </div>
              <div className="hidden sm:block text-left pr-1">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight truncate max-w-[110px]">
                  {currentUser?.name || "Recruiter"}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase font-semibold">
                  {currentUser?.role || "Team"}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {currentUser?.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {currentUser?.email}
                  </p>
                </div>

                {/* Team Management & Integrations */}
                <div className="py-1 border-b border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenTeamModal();
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    Manage Team & Recruiters
                  </button>

                  {onOpenIntegrationsModal && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenIntegrationsModal();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-sky-500" />
                      Integrations (Telegram)
                    </button>
                  )}
                </div>

                {/* Switch Active Recruiter view */}
                {recruiters.length > 1 && (
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">
                      Switch Active Recruiter
                    </p>
                    <select
                      value={currentUser?.id || ""}
                      onChange={(e) => {
                        const u = recruiters.find((r) => r.id === e.target.value);
                        if (u) {
                          onUserChange(u);
                          setUserMenuOpen(false);
                        }
                      }}
                      className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 cursor-pointer"
                    >
                      {recruiters.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Logout */}
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
