import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      isCompleted,
      isNotified,
      snoozeMinutes,
      dueAt,
      title,
      priority,
      advanceMinutes,
      currentUserName = "Recruiter",
    } = body;

    const existing = await prisma.reminder.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};

    if (isCompleted !== undefined) {
      dataToUpdate.isCompleted = isCompleted;
    }

    if (isNotified !== undefined) {
      dataToUpdate.isNotified = isNotified;
    }

    if (title !== undefined) {
      dataToUpdate.title = title;
    }

    if (priority !== undefined) {
      dataToUpdate.priority = priority;
    }

    if (advanceMinutes !== undefined) {
      dataToUpdate.advanceMinutes = Number(advanceMinutes);
    }

    if (dueAt !== undefined) {
      dataToUpdate.dueAt = new Date(dueAt);
      dataToUpdate.isNotified = false; // Reset notification trigger if rescheduled
    }

    // Snooze option: e.g. snooze 15 mins or 60 mins
    if (snoozeMinutes) {
      const newDue = new Date(Date.now() + snoozeMinutes * 60 * 1000);
      dataToUpdate.dueAt = newDue;
      dataToUpdate.isCompleted = false;
      dataToUpdate.isNotified = false;
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: dataToUpdate,
      include: {
        lead: { select: { id: true, fullName: true, phone: true, status: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (isCompleted) {
      await prisma.activityLog.create({
        data: {
          leadId: existing.leadId,
          action: "REMINDER_COMPLETED",
          details: `Reminder completed: "${existing.title}"`,
          userName: currentUserName,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating reminder:", error);
    return NextResponse.json(
      { error: "Failed to update reminder" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.reminder.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json(
      { error: "Failed to delete reminder" },
      { status: 500 }
    );
  }
}
