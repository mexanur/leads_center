"use client";

import React from "react";
import {
  Users,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Award,
} from "lucide-react";

interface StatsBarProps {
  stats: {
    totalLeads: number;
    newLeads: number;
    inProgress: number;
    hired: number;
    pendingFollowUps: number;
  };
  activeFilter?: string;
  onFilterChange: (status: string) => void;
}

export function StatsBar({ stats, activeFilter, onFilterChange }: StatsBarProps) {
  const cards = [
    {
      id: "ALL",
      label: "Total Leads",
      value: stats.totalLeads,
      icon: Users,
      color: "text-zinc-900 dark:text-zinc-100",
      bg: "bg-white dark:bg-zinc-900",
      border: "border-zinc-200 dark:border-zinc-800",
      highlight: "hover:border-zinc-300 dark:hover:border-zinc-700",
      activeBorder: "ring-2 ring-zinc-500",
    },
    {
      id: "NEW_LEAD",
      label: "New Inbound",
      value: stats.newLeads,
      icon: Sparkles,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50/40 dark:bg-blue-950/20",
      border: "border-blue-200/80 dark:border-blue-900/60",
      highlight: "hover:border-blue-300",
      activeBorder: "ring-2 ring-blue-500",
    },
    {
      id: "IN_PROGRESS",
      label: "Active Pipeline",
      value: stats.inProgress,
      icon: TrendingUp,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50/40 dark:bg-indigo-950/20",
      border: "border-indigo-200/80 dark:border-indigo-900/60",
      highlight: "hover:border-indigo-300",
      activeBorder: "ring-2 ring-indigo-500",
    },
    {
      id: "FOLLOW_UPS",
      label: "Due Follow-ups",
      value: stats.pendingFollowUps,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50/40 dark:bg-amber-950/20",
      border: "border-amber-200/80 dark:border-amber-900/60",
      highlight: "hover:border-amber-300",
      activeBorder: "ring-2 ring-amber-500",
    },
    {
      id: "APPROVED_HIRED",
      label: "Hired & Dispatched",
      value: stats.hired,
      icon: Award,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50/40 dark:bg-emerald-950/20",
      border: "border-emerald-200/80 dark:border-emerald-900/60",
      highlight: "hover:border-emerald-300",
      activeBorder: "ring-2 ring-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onFilterChange(card.id)}
            className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 text-left shadow-sm ${
              card.bg
            } ${card.border} ${card.highlight} ${
              isActive ? card.activeBorder : ""
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {card.label}
              </p>
              <p className={`text-2xl font-bold mt-0.5 ${card.color}`}>
                {card.value}
              </p>
            </div>
            <div className={`p-2.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 shadow-xs ${card.color}`}>
              <Icon className="w-5 h-5" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
