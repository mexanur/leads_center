import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      dueAt,
      advanceMinutes = 15,
      priority = "NORMAL",
      userId,
      currentUserName = "Recruiter",
    } = body;

    if (!title || !dueAt) {
      return NextResponse.json(
        { error: "Title and Due Date are required" },
        { status: 400 }
      );
    }

    const dueAtDate = new Date(dueAt);
    if (dueAtDate.getTime() < Date.now() - 60000) {
      return NextResponse.json(
        { error: "Reminder time cannot be in the past. Please select a future date and time." },
        { status: 400 }
      );
    }

    const parsedAdvance =
      advanceMinutes !== undefined && advanceMinutes !== null && !isNaN(Number(advanceMinutes))
        ? Number(advanceMinutes)
        : 15;

    const reminder = await prisma.reminder.create({
      data: {
        leadId: id,
        title: title.trim(),
        dueAt: new Date(dueAt),
        advanceMinutes: parsedAdvance,
        priority: priority || "NORMAL",
        userId: userId || null,
      },
      include: {
        lead: { select: { id: true, fullName: true, phone: true, status: true } },
        user: { select: { id: true, name: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        leadId: id,
        action: "REMINDER_CREATED",
        details: `Reminder set: "${title}" for ${new Date(dueAt).toLocaleString()}${
          parsedAdvance > 0 ? ` (${parsedAdvance}m advance)` : " (at time of event)"
        }`,
        userName: currentUserName,
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error("Error creating reminder:", error);
    return NextResponse.json(
      { error: "Failed to create reminder" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
    const body = await request.json();
    const { reminderIds, currentUserName = "Recruiter" } = body;

    if (!Array.isArray(reminderIds) || reminderIds.length === 0) {
      return NextResponse.json(
        { error: "No reminder IDs provided for deletion" },
        { status: 400 }
      );
    }

    const count = await prisma.reminder.count({
      where: {
        id: { in: reminderIds },
        leadId,
      },
    });

    if (count === 0) {
      return NextResponse.json(
        { error: "No matching reminders found" },
        { status: 404 }
      );
    }

    await prisma.reminder.deleteMany({
      where: {
        id: { in: reminderIds },
        leadId,
      },
    });

    await prisma.activityLog.create({
      data: {
        leadId,
        action: "BULK_REMINDERS_DELETED",
        details: `Bulk deleted ${count} follow-up reminder(s)`,
        userName: currentUserName,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: count,
    });
  } catch (error) {
    console.error("Error bulk deleting reminders:", error);
    return NextResponse.json(
      { error: "Failed to delete reminders" },
      { status: 500 }
    );
  }
}
