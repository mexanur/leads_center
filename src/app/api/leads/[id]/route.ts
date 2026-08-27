import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import serverCache from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: true,
        notes: {
          orderBy: { createdAt: "desc" },
          include: {
            author: { select: { id: true, name: true, avatar: true } },
          },
        },
        reminders: {
          orderBy: { dueAt: "asc" },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        files: {
          orderBy: { createdAt: "desc" },
          include: {
            uploader: { select: { id: true, name: true } },
          },
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { notes: true, reminders: true, files: true },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Error fetching single lead:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      source,
      sourceDetails,
      status,
      cdlType,
      experienceYears,
      endorsements,
      driverType,
      locationState,
      desiredPay,
      notesText,
      assignedToId,
      currentUserName = "Recruiter",
    } = body;

    // Check old lead for status change detection
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (fullName !== undefined) dataToUpdate.fullName = fullName;
    if (phone !== undefined) dataToUpdate.phone = phone;
    if (email !== undefined) dataToUpdate.email = email || null;
    if (source !== undefined) dataToUpdate.source = source;
    if (sourceDetails !== undefined) dataToUpdate.sourceDetails = sourceDetails || null;
    if (status !== undefined) dataToUpdate.status = status;
    if (cdlType !== undefined) dataToUpdate.cdlType = cdlType;
    if (experienceYears !== undefined) dataToUpdate.experienceYears = Number(experienceYears) || 0;
    if (endorsements !== undefined) {
      dataToUpdate.endorsements = Array.isArray(endorsements)
        ? JSON.stringify(endorsements)
        : endorsements;
    }
    if (driverType !== undefined) dataToUpdate.driverType = driverType || null;
    if (locationState !== undefined) dataToUpdate.locationState = locationState || null;
    if (desiredPay !== undefined) dataToUpdate.desiredPay = desiredPay || null;
    if (notesText !== undefined) dataToUpdate.notesText = notesText || null;
    if (assignedToId !== undefined) dataToUpdate.assignedToId = assignedToId || null;

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: dataToUpdate,
      include: {
        assignedTo: true,
        notes: {
          orderBy: { createdAt: "desc" },
          include: { author: true },
        },
        reminders: {
          orderBy: { dueAt: "asc" },
        },
        files: {
          orderBy: { createdAt: "desc" },
          include: { uploader: true },
        },
        _count: {
          select: { notes: true, reminders: true, files: true },
        },
      },
    });

    // If status changed, record activity
    if (status && status !== existing.status) {
      await prisma.activityLog.create({
        data: {
          leadId: id,
          action: "STATUS_CHANGE",
          details: `Stage updated from ${existing.status} to ${status}`,
          userName: currentUserName,
        },
      });
      serverCache.invalidateByPrefix("global_stats");
    }

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
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
    await prisma.lead.delete({
      where: { id },
    });
    serverCache.invalidateByPrefix("global_stats");
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 }
    );
  }
}
