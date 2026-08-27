"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  Award,
  Clock,
  Ban,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Kanban,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Truck,
  Sparkles,
} from "lucide-react";
import { SourceBadge } from "@/components/common/SourceBadge";
import { PIPELINE_COLUMNS, LeadSource, LeadStatus } from "@/types";
import { toast } from "sonner";

interface AnalyticsResponse {
  summary: {
    totalLeads: number;
    hiredCount: number;
    activePipelineCount: number;
    disqualifiedCount: number;
    overallConversionRate: number;
    disqualificationRate: number;
    avgDaysToHire: string;
    totalOverdueReminders: number;
    totalActiveReminders: number;
  };
  funnel: Array<{
    stage: string;
    key: string;
    count: number;
    conversionFromTotal: number;
    dropoffRate: number;
  }>;
  statusCounts: Record<LeadStatus, number>;
  sourceLeaderboard: Array<{
    source: string;
    total: number;
    hired: number;
    conversionRate: string;
    shareOfTotal: string;
  }>;
  recruiterLeaderboard: Array<{
    id: string;
    name: string;
    avatar?: string;
    totalAssigned: number;
    hired: number;
    contacted: number;
    active: number;
    conversionRate: string;
  }>;
  cdlCounts: Record<string, number>;
  driverTypeCounts: Record<string, number>;
  endorsementCounts: Record<string, number>;
}

type TimeRange = "ALL" | "TODAY" | "7D" | "30D" | "90D" | "THIS_YEAR";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("ALL");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/analytics?timeRange=${timeRange}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error("Failed to load analytics");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching analytics data");
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-600/20 group-hover:scale-105 transition-transform">
                LC
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                  Leads Center
                </h1>
                <p className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">
                  Analytics & ROI Intelligence
                </p>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-700/60 transition-all"
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Pipeline & Leads</span>
              </Link>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-900 shadow-2xs">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics Dashboard</span>
              </div>
            </nav>
          </div>

          {/* Right Action: Refresh & Back to Board */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchAnalytics}
              disabled={isLoading}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors shadow-2xs cursor-pointer"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 active:scale-98 transition-all"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Back to Pipeline</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Title & Time Range Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>Recruitment Performance & Conversion Metrics</span>
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Live tracking of conversion efficiency, acquisition channels, and recruiter productivity.
            </p>
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
            {(
              [
                { id: "ALL", label: "All Time" },
                { id: "TODAY", label: "Today" },
                { id: "7D", label: "7 Days" },
                { id: "30D", label: "30 Days" },
                { id: "90D", label: "90 Days" },
                { id: "THIS_YEAR", label: "This Year" },
              ] as const
            ).map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeRange === range.id
                    ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-2xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Spinner */}
        {isLoading && !data && (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-zinc-500">Calculating recruitment analytics...</p>
          </div>
        )}

        {summary && (
          <>
            {/* 1. Executive Summary KPIs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Conversion Rate */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs relative overflow-hidden group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Conversion Rate
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                    {summary.overallConversionRate}%
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {summary.hiredCount} Hired
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, summary.overallConversionRate * 3)}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-zinc-400">
                  {summary.hiredCount} of {summary.totalLeads} total leads onboarded
                </p>
              </div>

              {/* Total Leads */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Total Leads
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                    {summary.totalLeads}
                  </span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                    Acquired
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  <span>Active in pipeline:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {summary.activePipelineCount}
                  </span>
                </div>
              </div>

              {/* Drivers Hired */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Hired & Active
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                    {summary.hiredCount}
                  </span>
                  <span className="text-xs font-bold text-zinc-400">Drivers</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  <span>Avg time to hire:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    {summary.avgDaysToHire} {summary.avgDaysToHire !== "N/A" ? "days" : ""}
                  </span>
                </div>
              </div>

              {/* Disqualified & Dropoff */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Disqualified
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <Ban className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                    {summary.disqualifiedCount}
                  </span>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {summary.disqualificationRate}%
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
                  <span>Overdue follow-ups:</span>
                  <span className={`font-bold ${summary.totalOverdueReminders > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {summary.totalOverdueReminders}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Visual Pipeline Stage Conversion Funnel */}
            <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Recruitment Pipeline Stage Funnel</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Conversion flow and volume retention from initial acquisition to hired driver.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                {data.funnel.map((step, idx) => {
                  const stageColors = [
                    "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300",
                    "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300",
                    "border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300",
                    "border-purple-300 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300",
                    "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300",
                  ];
                  const barColors = [
                    "from-blue-500 to-blue-600",
                    "from-amber-500 to-amber-600",
                    "from-indigo-500 to-indigo-600",
                    "from-purple-500 to-purple-600",
                    "from-emerald-500 to-emerald-600",
                  ];

                  return (
                    <div
                      key={step.key}
                      className={`p-4 rounded-xl border ${stageColors[idx]} flex flex-col justify-between relative overflow-hidden`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                          <span>STEP {idx + 1}</span>
                          <span>{step.conversionFromTotal}%</span>
                        </div>
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-1">
                          {step.stage}
                        </h4>
                        <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
                          {step.count}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`bg-gradient-to-r ${barColors[idx]} h-full rounded-full transition-all duration-500`}
                            style={{ width: `${Math.max(4, step.conversionFromTotal)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-zinc-400 block mt-1">
                          {idx === 0
                            ? "100% total pool"
                            : `${step.conversionFromTotal}% reached stage`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Acquisition Channel ROI & Recruiter Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Source Channel ROI Breakdown */}
              <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Lead Source Channel ROI & Conversion</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-4">
                    Which advertising sources deliver the highest volume and hire rates.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold uppercase text-[10px]">
                          <th className="py-2.5 px-2">Source Channel</th>
                          <th className="py-2.5 px-2 text-right">Leads</th>
                          <th className="py-2.5 px-2 text-right">Hires</th>
                          <th className="py-2.5 px-2 text-right">Conv. Rate</th>
                          <th className="py-2.5 px-2 text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                        {data.sourceLeaderboard.map((src) => (
                          <tr key={src.source} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td className="py-3 px-2">
                              <SourceBadge source={src.source as LeadSource} />
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-zinc-900 dark:text-zinc-100">
                              {src.total}
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {src.hired}
                            </td>
                            <td className="py-3 px-2 text-right font-bold">
                              <span
                                className={`px-2 py-0.5 rounded-md ${
                                  Number(src.conversionRate) >= 20
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : Number(src.conversionRate) >= 10
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                }`}
                              >
                                {src.conversionRate}%
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right text-zinc-400">
                              {src.shareOfTotal}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {data.sourceLeaderboard.length === 0 && (
                      <p className="text-center py-6 text-xs text-zinc-400">No lead sources found in this range.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Recruiter Performance Leaderboard */}
              <div className="bg-white dark:bg-zinc-900 p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Recruiter Team Performance Leaderboard</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-4">
                    Productivity, driver onboarding success, and win rates by recruiter.
                  </p>

                  <div className="space-y-3">
                    {data.recruiterLeaderboard.map((rec, rank) => {
                      const rankColors = [
                        "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700",
                        "bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700",
                        "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                      ];

                      return (
                        <div
                          key={rec.id}
                          className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 border ${
                                rank < 3
                                  ? rankColors[rank]
                                  : "bg-zinc-100 dark:bg-zinc-850 text-zinc-500 border-zinc-200 dark:border-zinc-800"
                              }`}
                            >
                              #{rank + 1}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0">
                              {rec.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                {rec.name}
                              </h4>
                              <p className="text-[11px] text-zinc-400">
                                {rec.totalAssigned} assigned • {rec.active} active
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0 text-right">
                            <div>
                              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 block">
                                {rec.hired} Hired
                              </span>
                              <span className="text-[10px] font-bold text-zinc-400">
                                {rec.conversionRate}% Win Rate
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {data.recruiterLeaderboard.length === 0 && (
                      <p className="text-center py-6 text-xs text-zinc-400">No recruiters found.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Driver Qualifications & Demographics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* CDL License Classes */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>CDL License Classification</span>
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(data.cdlCounts).map(([cdl, count]) => {
                    const pct = summary.totalLeads > 0 ? Math.round((count / summary.totalLeads) * 100) : 0;
                    return (
                      <div key={cdl}>
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {cdl.replace("_", " ")}
                          </span>
                          <span className="text-zinc-500 font-bold">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Route & Driver Types */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                  <Kanban className="w-4 h-4 text-indigo-600" />
                  <span>Route & Driver Types</span>
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(data.driverTypeCounts).map(([dtype, count]) => {
                    const pct = summary.totalLeads > 0 ? Math.round((count / summary.totalLeads) * 100) : 0;
                    return (
                      <div key={dtype}>
                        <div className="flex items-center justify-between text-xs font-semibold mb-1">
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {dtype.replace("_", " ")}
                          </span>
                          <span className="text-zinc-500 font-bold">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Endorsements Distribution */}
              <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Driver Endorsements</span>
                </h4>
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(data.endorsementCounts).map(([end, count]) => (
                    <span
                      key={end}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/60"
                    >
                      <span>{end}</span>
                      <span className="px-1.5 py-0.2 rounded-md bg-blue-600 text-white text-[10px] font-black">
                        {count}
                      </span>
                    </span>
                  ))}

                  {Object.keys(data.endorsementCounts).length === 0 && (
                    <p className="text-xs text-zinc-400 py-4">No driver endorsements recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
