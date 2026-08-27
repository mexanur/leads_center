import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "6", 10)));
    const status = searchParams.get("status") || "ALL"; // ALL, COMPLETED, ACTIVE
    const userId = searchParams.get("userId") || "";
    const search = searchParams.get("search") || "";

    const where: any = {};

    if (status === "COMPLETED") {
      where.isCompleted = true;
    } else if (status === "ACTIVE") {
      where.isCompleted = false;
    }

    if (userId && userId !== "ALL") {
      where.userId = userId;
    }

    if (search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { lead: { fullName: { contains: search.trim(), mode: "insensitive" } } },
        { lead: { phone: { contains: search.trim(), mode: "insensitive" } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, reminders] = await Promise.all([
      prisma.reminder.count({ where }),
      prisma.reminder.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        include: {
          lead: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              status: true,
              locationState: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      reminders,
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (error) {
    console.error("Error fetching reminder history:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminder history" },
      { status: 500 }
    );
  }
}
