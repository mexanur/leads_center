"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { StatsBar } from "@/components/stats/StatsBar";
import { FilterBar } from "@/components/filter/FilterBar";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { LeadsTable } from "@/components/list/LeadsTable";
import { LeadDetailDrawer } from "@/components/lead-detail/LeadDetailDrawer";
import { NewLeadModal } from "@/components/lead-modal/NewLeadModal";
import { TeamManagementModal } from "@/components/team/TeamManagementModal";
import { Lead, User, LeadStatus } from "@/types";

export default function LeadsCenterPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [recruiters, setRecruiters] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    inProgress: 0,
    hired: 0,
    pendingFollowUps: 0,
  });

  // Views & Filters
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [cdlFilter, setCdlFilter] = useState("ALL");
  const [recruiterFilter, setRecruiterFilter] = useState("ALL");

  // Drawers / Modals
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [drawerDefaultTab, setDrawerDefaultTab] = useState<
    "overview" | "notes" | "reminders" | "activity"
  >("overview");
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newLeadDefaultStatus, setNewLeadDefaultStatus] = useState("NEW_LEAD");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const initialLoadedRef = useRef(false);

  // Fast Unified Dashboard Data Fetcher
  const loadDashboardData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);

      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (sourceFilter !== "ALL") params.append("source", sourceFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (cdlFilter !== "ALL") params.append("cdlType", cdlFilter);
      if (recruiterFilter !== "ALL") params.append("recruiterId", recruiterFilter);

      const res = await fetch(`/api/dashboard/bootstrap?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        if (data.stats) setStats(data.stats);
        if (data.recruiters) setRecruiters(data.recruiters);
        if (data.currentUser) {
          setCurrentUser((prev) => (prev?.id === data.currentUser?.id ? prev : data.currentUser));
        } else if (data.recruiters?.length > 0) {
          setCurrentUser((prev) => prev || data.recruiters[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      toast.error("Failed to fetch driver leads");
    } finally {
      setIsLoading(false);
    }
  }, [search, sourceFilter, statusFilter, cdlFilter, recruiterFilter]);

  useEffect(() => {
    const isInitial = !initialLoadedRef.current;
    initialLoadedRef.current = true;
    loadDashboardData(isInitial);
  }, [loadDashboardData, refreshTrigger]);

  const handleLeadUpdated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  // Optimistic Quick Lead Status update
  const handleUpdateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    // Optimistic UI update immediately
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          currentUserName: currentUser?.name || "Recruiter",
        }),
      });

      if (res.ok) {
        toast.success(`Stage updated to ${newStatus.replace(/_/g, " ")}`);
        // Background refresh stats
        fetch("/api/stats")
          .then((r) => r.json())
          .then((s) => setStats(s))
          .catch(() => {});
      } else {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      toast.error("Could not update stage");
      loadDashboardData();
    }
  };

  // Delete Lead
  const handleDeleteLead = async (leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Lead removed");
        handleLeadUpdated();
      }
    } catch (err) {
      toast.error("Failed to delete lead");
      loadDashboardData();
    }
  };

  // Open Lead Drawer
  const handleSelectLead = (lead: Lead | { id: string }, tab: "overview" | "notes" | "reminders" = "overview") => {
    setSelectedLeadId(lead.id);
    setDrawerDefaultTab(tab);
  };

  const handleQuickAddNote = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadId(leadId);
    setDrawerDefaultTab("notes");
  };

  const handleQuickAddReminder = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadId(leadId);
    setDrawerDefaultTab("reminders");
  };

  const handleAddLeadToStage = (stageId: string) => {
    setNewLeadDefaultStatus(stageId);
    setIsNewLeadModalOpen(true);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSourceFilter("ALL");
    setStatusFilter("ALL");
    setCdlFilter("ALL");
    setRecruiterFilter("ALL");
  };

  // Stats bar click filter
  const handleStatsFilter = (filterType: string) => {
    if (filterType === "ALL") {
      setStatusFilter("ALL");
    } else if (filterType === "IN_PROGRESS") {
      setStatusFilter("CONTACTED");
    } else if (filterType === "FOLLOW_UPS") {
      setViewMode("list");
    } else {
      setStatusFilter(filterType);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (leads.length === 0) {
      toast.info("No leads to export");
      return;
    }

    const headers = [
      "Full Name",
      "Phone",
      "Email",
      "Source",
      "Source Details",
      "Stage",
      "CDL Type",
      "Experience (Yrs)",
      "Location State",
      "Desired Pay",
      "Assigned Recruiter",
      "Created Date",
    ];

    const rows = leads.map((l) => [
      `"${l.fullName.replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${l.email || ""}"`,
      `"${l.source}"`,
      `"${(l.sourceDetails || "").replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${l.cdlType}"`,
      l.experienceYears || 0,
      `"${l.locationState || ""}"`,
      `"${(l.desiredPay || "").replace(/"/g, '""')}"`,
      `"${l.assignedTo?.name || "Unassigned"}"`,
      `"${new Date(l.createdAt).toLocaleDateString()}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `truck_driver_leads_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Exported leads to CSV");
  };

  return (
    <div className="min-h-screen bg-zinc-100/60 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors">
      {/* Main Header */}
      <Header
        onOpenNewLead={() => {
          setNewLeadDefaultStatus("NEW_LEAD");
          setIsNewLeadModalOpen(true);
        }}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        onSelectLead={(id) => handleSelectLead({ id })}
        recruiters={recruiters}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        refreshTrigger={refreshTrigger}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        {/* Metric Summary Cards */}
        <StatsBar
          stats={stats}
          activeFilter={statusFilter}
          onFilterChange={handleStatsFilter}
        />

        {/* Global Filter Bar */}
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          source={sourceFilter}
          onSourceChange={setSourceFilter}
          status={statusFilter}
          onStatusChange={setStatusFilter}
          cdlType={cdlFilter}
          onCdlTypeChange={setCdlFilter}
          recruiterId={recruiterFilter}
          onRecruiterChange={setRecruiterFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          recruiters={recruiters}
          onResetFilters={handleResetFilters}
          onExportCsv={handleExportCsv}
          totalFiltered={leads.length}
        />

        {/* Main Work Area: Dual Views */}
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-2.5">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 tracking-wide">
              Loading...
            </p>
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanBoard
            leads={leads}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onSelectLead={(lead) => handleSelectLead(lead, "overview")}
            onQuickAddNote={handleQuickAddNote}
            onQuickAddReminder={handleQuickAddReminder}
            onAddLeadToStage={handleAddLeadToStage}
            onDeleteLead={handleDeleteLead}
            onLeadUpdated={handleLeadUpdated}
          />
        ) : (
          <LeadsTable
            leads={leads}
            onSelectLead={(lead) => handleSelectLead(lead, "overview")}
            onUpdateLeadStatus={handleUpdateLeadStatus}
            onDeleteLead={handleDeleteLead}
            onQuickAddNote={handleQuickAddNote}
            onQuickAddReminder={handleQuickAddReminder}
            onLeadUpdated={handleLeadUpdated}
          />
        )}
      </main>

      {/* Lead Detail Slide-over Drawer */}
      <LeadDetailDrawer
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onLeadUpdated={handleLeadUpdated}
        recruiters={recruiters}
        currentUser={currentUser}
        defaultTab={drawerDefaultTab}
      />

      {/* New Driver Lead Modal with Validation & Deduplication */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        onLeadCreated={() => {
          toast.success("Driver lead created successfully!");
          handleLeadUpdated();
        }}
        onSelectExistingLead={(id) => handleSelectLead({ id })}
        recruiters={recruiters}
        currentUser={currentUser}
        defaultStatus={newLeadDefaultStatus}
      />

      {/* Team & Recruiter Management Modal */}
      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        recruiters={recruiters}
        onTeamUpdated={() => {
          handleLeadUpdated();
        }}
        currentUser={currentUser}
      />
    </div>
  );
}
