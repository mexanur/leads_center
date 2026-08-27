import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serverCache } from "@/lib/cache";
import { LeadStatus, CDLType } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get("timeRange") || "ALL"; // ALL, TODAY, 7D, 30D, 90D, THIS_YEAR

    // Calculate start date based on timeRange
    let startDate: Date | null = null;
    const now = new Date();

    if (timeRange === "TODAY") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === "7D") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "30D") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "90D") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "THIS_YEAR") {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const cacheKey = `analytics_${timeRange}`;

    const analyticsData = await serverCache.getOrSet(cacheKey, 15, async () => {
      const whereCondition = startDate
        ? { createdAt: { gte: startDate } }
        : {};

      // Fetch all relevant leads for analysis
      const [leads, recruiters, totalOverdueReminders, totalActiveReminders] = await Promise.all([
        prisma.lead.findMany({
          where: whereCondition,
          select: {
            id: true,
            fullName: true,
            status: true,
            source: true,
            cdlType: true,
            driverType: true,
            experienceYears: true,
            locationState: true,
            endorsements: true,
            assignedToId: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        }),
        prisma.reminder.count({
          where: {
            isCompleted: false,
            dueAt: { lt: now },
          },
        }),
        prisma.reminder.count({
          where: {
            isCompleted: false,
          },
        }),
      ]);

      const totalLeads = leads.length;

      // Stage metrics
      const statusCounts: Record<LeadStatus, number> = {
        NEW_LEAD: 0,
        CONTACTED: 0,
        APPLICATION_SENT: 0,
        DOCS_MVR_REVIEW: 0,
        APPROVED_HIRED: 0,
        REJECTED_ARCHIVED: 0,
      };

      // Source metrics
      const sourceCounts: Record<string, { total: number; hired: number }> = {};

      // CDL & Driver Types
      const cdlCounts: Record<CDLType, number> = {
        CLASS_A: 0,
        CLASS_B: 0,
        CLASS_C: 0,
        NON_CDL: 0,
      };

      const driverTypeCounts: Record<string, number> = {
        OTR: 0,
        REGIONAL: 0,
        LOCAL: 0,
        DEDICATED: 0,
        TEAM: 0,
        OWNER_OPERATOR: 0,
      };

      const endorsementCounts: Record<string, number> = {};

      // Recruiter stats map
      const recruiterMap: Record<
        string,
        {
          id: string;
          name: string;
          avatar?: string;
          totalAssigned: number;
          hired: number;
          contacted: number;
          active: number;
        }
      > = {};

      // Initialize recruiter map
      for (const rec of recruiters) {
        recruiterMap[rec.id] = {
          id: rec.id,
          name: rec.name,
          avatar: rec.avatar || undefined,
          totalAssigned: 0,
          hired: 0,
          contacted: 0,
          active: 0,
        };
      }

      // Calculate time to hire for APPROVED_HIRED leads (in days)
      let totalHireDays = 0;
      let hiredWithDaysCount = 0;

      for (const lead of leads) {
        const leadStatus = lead.status as LeadStatus;
        if (statusCounts[leadStatus] !== undefined) {
          statusCounts[leadStatus]++;
        }

        // Source count
        const src = lead.source || "OTHER";
        if (!sourceCounts[src]) {
          sourceCounts[src] = { total: 0, hired: 0 };
        }
        sourceCounts[src].total++;
        if (leadStatus === "APPROVED_HIRED") {
          sourceCounts[src].hired++;
        }

        // CDL count
        const cdl = (lead.cdlType || "CLASS_A") as CDLType;
        if (cdlCounts[cdl] !== undefined) {
          cdlCounts[cdl]++;
        }

        // Driver type count
        const driverType = lead.driverType || "OTR";
        if (driverTypeCounts[driverType] !== undefined) {
          driverTypeCounts[driverType]++;
        } else {
          driverTypeCounts[driverType] = 1;
        }

        // Endorsements
        if (lead.endorsements) {
          try {
            const ends = JSON.parse(lead.endorsements);
            if (Array.isArray(ends)) {
              for (const e of ends) {
                endorsementCounts[e] = (endorsementCounts[e] || 0) + 1;
              }
            }
          } catch {
            // ignore non-json
          }
        }

        // Recruiter breakdown
        if (lead.assignedToId && recruiterMap[lead.assignedToId]) {
          const rec = recruiterMap[lead.assignedToId];
          rec.totalAssigned++;
          if (leadStatus === "APPROVED_HIRED") rec.hired++;
          if (leadStatus !== "NEW_LEAD" && leadStatus !== "REJECTED_ARCHIVED") rec.contacted++;
          if (leadStatus !== "APPROVED_HIRED" && leadStatus !== "REJECTED_ARCHIVED") rec.active++;
        }

        // Time to hire
        if (leadStatus === "APPROVED_HIRED") {
          const diffMs = new Date(lead.updatedAt).getTime() - new Date(lead.createdAt).getTime();
          const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
          totalHireDays += diffDays;
          hiredWithDaysCount++;
        }
      }

      const hiredCount = statusCounts.APPROVED_HIRED;
      const disqualifiedCount = statusCounts.REJECTED_ARCHIVED;
      const activePipelineCount =
        statusCounts.NEW_LEAD +
        statusCounts.CONTACTED +
        statusCounts.APPLICATION_SENT +
        statusCounts.DOCS_MVR_REVIEW;

      const overallConversionRate =
        totalLeads > 0 ? ((hiredCount / totalLeads) * 100).toFixed(1) : "0.0";
      const disqualificationRate =
        totalLeads > 0 ? ((disqualifiedCount / totalLeads) * 100).toFixed(1) : "0.0";
      const avgDaysToHire =
        hiredWithDaysCount > 0
          ? (totalHireDays / hiredWithDaysCount).toFixed(1)
          : "N/A";

      // Build visual funnel data with step-to-step dropoff
      const funnel = [
        {
          stage: "New Leads",
          key: "NEW_LEAD",
          count: totalLeads,
          conversionFromTotal: 100,
          dropoffRate: 0,
        },
        {
          stage: "Contacted",
          key: "CONTACTED",
          count: totalLeads - statusCounts.NEW_LEAD,
          conversionFromTotal:
            totalLeads > 0
              ? Math.round(((totalLeads - statusCounts.NEW_LEAD) / totalLeads) * 100)
              : 0,
          dropoffRate:
            totalLeads > 0
              ? Math.round((statusCounts.NEW_LEAD / totalLeads) * 100)
              : 0,
        },
        {
          stage: "Application Sent",
          key: "APPLICATION_SENT",
          count: statusCounts.APPLICATION_SENT + statusCounts.DOCS_MVR_REVIEW + statusCounts.APPROVED_HIRED,
          conversionFromTotal:
            totalLeads > 0
              ? Math.round(
                  ((statusCounts.APPLICATION_SENT +
                    statusCounts.DOCS_MVR_REVIEW +
                    statusCounts.APPROVED_HIRED) /
                    totalLeads) *
                    100
                )
              : 0,
          dropoffRate:
            totalLeads > 0
              ? Math.round(
                  ((totalLeads -
                    (statusCounts.APPLICATION_SENT +
                      statusCounts.DOCS_MVR_REVIEW +
                      statusCounts.APPROVED_HIRED)) /
                    totalLeads) *
                    100
                )
              : 0,
        },
        {
          stage: "Docs & MVR Review",
          key: "DOCS_MVR_REVIEW",
          count: statusCounts.DOCS_MVR_REVIEW + statusCounts.APPROVED_HIRED,
          conversionFromTotal:
            totalLeads > 0
              ? Math.round(
                  ((statusCounts.DOCS_MVR_REVIEW + statusCounts.APPROVED_HIRED) / totalLeads) * 100
                )
              : 0,
          dropoffRate:
            totalLeads > 0
              ? Math.round(
                  ((totalLeads - (statusCounts.DOCS_MVR_REVIEW + statusCounts.APPROVED_HIRED)) /
                    totalLeads) *
                    100
                )
              : 0,
        },
        {
          stage: "Approved & Hired",
          key: "APPROVED_HIRED",
          count: hiredCount,
          conversionFromTotal:
            totalLeads > 0 ? Math.round((hiredCount / totalLeads) * 100) : 0,
          dropoffRate:
            totalLeads > 0
              ? Math.round(((totalLeads - hiredCount) / totalLeads) * 100)
              : 0,
        },
      ];

      // Format source leaderboard
      const sourceLeaderboard = Object.entries(sourceCounts)
        .map(([source, data]) => ({
          source,
          total: data.total,
          hired: data.hired,
          conversionRate:
            data.total > 0 ? ((data.hired / data.total) * 100).toFixed(1) : "0.0",
          shareOfTotal:
            totalLeads > 0 ? ((data.total / totalLeads) * 100).toFixed(1) : "0.0",
        }))
        .sort((a, b) => b.total - a.total);

      // Format recruiter leaderboard
      const recruiterLeaderboard = Object.values(recruiterMap)
        .map((rec) => ({
          ...rec,
          conversionRate:
            rec.totalAssigned > 0
              ? ((rec.hired / rec.totalAssigned) * 100).toFixed(1)
              : "0.0",
        }))
        .sort((a, b) => b.hired - a.hired || b.totalAssigned - a.totalAssigned);

      return {
        summary: {
          totalLeads,
          hiredCount,
          activePipelineCount,
          disqualifiedCount,
          overallConversionRate: Number(overallConversionRate),
          disqualificationRate: Number(disqualificationRate),
          avgDaysToHire,
          totalOverdueReminders,
          totalActiveReminders,
        },
        funnel,
        statusCounts,
        sourceLeaderboard,
        recruiterLeaderboard,
        cdlCounts,
        driverTypeCounts,
        endorsementCounts,
      };
    });

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Error generating analytics:", error);
    return NextResponse.json(
      { error: "Failed to load recruitment analytics" },
      { status: 500 }
    );
  }
}
