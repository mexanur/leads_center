import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Run all 3 aggregation queries in parallel (1 single roundtrip)
    const [byStatus, bySource, pendingFollowUps] = await Promise.all([
      prisma.lead.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.lead.groupBy({
        by: ["source"],
        _count: { id: true },
      }),
      prisma.reminder.count({
        where: {
          isCompleted: false,
          dueAt: { lte: endOfToday },
        },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    let totalLeads = 0;

    for (const item of byStatus) {
      statusMap[item.status] = item._count.id;
      totalLeads += item._count.id;
    }

    const newLeads = statusMap["NEW_LEAD"] || 0;
    const inProgress =
      (statusMap["CONTACTED"] || 0) +
      (statusMap["APPLICATION_SENT"] || 0) +
      (statusMap["DOCS_MVR_REVIEW"] || 0);
    const hired = statusMap["APPROVED_HIRED"] || 0;
    const archived = statusMap["REJECTED_ARCHIVED"] || 0;

    return NextResponse.json({
      totalLeads,
      newLeads,
      inProgress,
      hired,
      archived,
      pendingFollowUps,
      bySource: bySource.map((s) => ({ source: s.source, count: s._count.id })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
