import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import serverCache from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const source = searchParams.get("source") || "";
    const cdlType = searchParams.get("cdlType") || "";
    const recruiterId = searchParams.get("recruiterId") || "";

    const isUnfiltered = !search.trim() && (!status || status === "ALL") && (!source || source === "ALL") && (!cdlType || cdlType === "ALL") && (!recruiterId || recruiterId === "ALL");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (source && source !== "ALL") where.source = source;
    if (cdlType && cdlType !== "ALL") where.cdlType = cdlType;
    if (recruiterId && recruiterId !== "ALL") where.assignedToId = recruiterId;

    if (search.trim()) {
      where.OR = [
        { fullName: { contains: search.trim(), mode: "insensitive" } },
        { phone: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
        { sourceDetails: { contains: search.trim(), mode: "insensitive" } },
        { locationState: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const now = new Date();
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Parallel fetch with cached recruiters and cached global stats
    const [currentUser, allUsers, leads, statsData] = await Promise.all([
      getCurrentUser(),
      serverCache.getOrSet("all_recruiters", 60, () =>
        prisma.user.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatar: true,
            _count: { select: { leads: true, reminders: true } },
          },
        })
      ),
      prisma.lead.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          notes: {
            orderBy: { createdAt: "desc" },
            take: 3,
            include: {
              author: { select: { id: true, name: true, avatar: true } },
            },
          },
          reminders: {
            where: { isCompleted: false },
            orderBy: { dueAt: "asc" },
            take: 2,
          },
          _count: { select: { notes: true, reminders: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      isUnfiltered
        ? serverCache.getOrSet("global_stats", 15, async () => {
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
            return { byStatus, bySource, pendingFollowUps };
          })
        : Promise.all([
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
          ]).then(([byStatus, bySource, pendingFollowUps]) => ({
            byStatus,
            bySource,
            pendingFollowUps,
          })),
    ]);

    const { byStatus, bySource, pendingFollowUps } = statsData;

    const statusMap: Record<string, number> = {};
    let totalLeads = 0;
    for (const item of byStatus) {
      statusMap[item.status] = item._count.id;
      totalLeads += item._count.id;
    }

    const stats = {
      totalLeads,
      newLeads: statusMap["NEW_LEAD"] || 0,
      inProgress:
        (statusMap["CONTACTED"] || 0) +
        (statusMap["APPLICATION_SENT"] || 0) +
        (statusMap["DOCS_MVR_REVIEW"] || 0),
      hired: statusMap["APPROVED_HIRED"] || 0,
      archived: statusMap["REJECTED_ARCHIVED"] || 0,
      pendingFollowUps,
      bySource: bySource.map((s) => ({ source: s.source, count: s._count.id })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    };

    return NextResponse.json(
      {
        currentUser,
        recruiters: allUsers,
        leads,
        stats,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, stale-while-revalidate=10",
        },
      }
    );
  } catch (error) {
    console.error("Dashboard bootstrap error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
