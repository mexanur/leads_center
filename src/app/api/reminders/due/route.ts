import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const now = new Date();
    // Only query reminders due within the next 48 hours or overdue
    const futureLimit = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const where: any = {
      isCompleted: false,
      dueAt: {
        lte: futureLimit,
      },
    };

    if (userId && userId !== "ALL") {
      where.userId = userId;
    }

    const reminders = await prisma.reminder.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            source: true,
            status: true,
            cdlType: true,
          },
        },
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { dueAt: "asc" },
      take: 50,
    });

    const overdue: any[] = [];
    const dueSoon: any[] = [];
    const upcoming: any[] = [];

    for (const rem of reminders) {
      const due = new Date(rem.dueAt);
      const advanceMinutes = rem.advanceMinutes !== undefined && rem.advanceMinutes !== null ? rem.advanceMinutes : 15;
      const advanceMs = advanceMinutes * 60 * 1000;
      const alertThreshold = new Date(due.getTime() - advanceMs);

      if (now > due) {
        overdue.push(rem);
      } else if (now >= alertThreshold) {
        dueSoon.push(rem);
      } else {
        upcoming.push(rem);
      }
    }

    return NextResponse.json({
      totalAlerts: overdue.length + dueSoon.length,
      overdue,
      dueSoon,
      upcoming,
      allActive: reminders,
    });
  } catch (error) {
    console.error("Error fetching due reminders:", error);
    return NextResponse.json(
      { error: "Failed to fetch due reminders" },
      { status: 500 }
    );
  }
}
