import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import serverCache from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const source = searchParams.get("source") || "";
    const cdlType = searchParams.get("cdlType") || "";
    const recruiterId = searchParams.get("recruiterId") || "";

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (source && source !== "ALL") {
      where.source = source;
    }

    if (cdlType && cdlType !== "ALL") {
      where.cdlType = cdlType;
    }

    if (recruiterId && recruiterId !== "ALL") {
      where.assignedToId = recruiterId;
    }

    if (search.trim()) {
      where.OR = [
        { fullName: { contains: search.trim(), mode: "insensitive" } },
        { phone: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
        { sourceDetails: { contains: search.trim(), mode: "insensitive" } },
        { locationState: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const leads = await prisma.lead.findMany({
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
        _count: {
          select: { notes: true, reminders: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      source = "FACEBOOK",
      sourceDetails,
      status = "NEW_LEAD",
      cdlType = "CLASS_A",
      experienceYears = 0,
      endorsements,
      driverType,
      locationState,
      desiredPay,
      notesText,
      assignedToId,
      initialNote,
      reminderDueAt,
      reminderTitle,
      reminderAdvanceMinutes = 15,
      currentUserName = "Recruiter",
      allowDuplicate = false,
    } = body;

    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json(
        { error: "Driver Full Name is required." },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    // Phone validation (at least 10 digits for standard phone)
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      return NextResponse.json(
        { error: "Please enter a valid phone number with at least 10 digits." },
        { status: 400 }
      );
    }

    // Email validation if provided
    let cleanEmail: string | null = null;
    if (email && typeof email === "string" && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const normalized = email.trim().toLowerCase();
      if (!emailRegex.test(normalized)) {
        return NextResponse.json(
          { error: "Please enter a valid email address (e.g. driver@domain.com)." },
          { status: 400 }
        );
      }
      cleanEmail = normalized;
    }

    // Reminder validation if provided
    if (reminderDueAt) {
      const dueAtDate = new Date(reminderDueAt);
      if (dueAtDate.getTime() < Date.now() - 60000) {
        return NextResponse.json(
          { error: "Scheduled reminder time cannot be in the past. Please select a future date and time." },
          { status: 400 }
        );
      }
    }

    // Deduplication check
    if (!allowDuplicate) {
      // 1. Check by email
      if (cleanEmail) {
        const existingByEmail = await prisma.lead.findFirst({
          where: {
            email: { equals: cleanEmail, mode: "insensitive" },
          },
          include: {
            assignedTo: { select: { id: true, name: true } },
          },
        });

        if (existingByEmail) {
          return NextResponse.json(
            {
              error: "A lead with this email address already exists.",
              isDuplicate: true,
              existingLead: {
                id: existingByEmail.id,
                fullName: existingByEmail.fullName,
                phone: existingByEmail.phone,
                email: existingByEmail.email,
                status: existingByEmail.status,
                source: existingByEmail.source,
                createdAt: existingByEmail.createdAt,
                assignedTo: existingByEmail.assignedTo?.name || "Unassigned",
              },
            },
            { status: 409 }
          );
        }
      }

      // 2. Check by phone
      const last4 = phoneDigits.slice(-4);
      const normalizedSearch = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;

      const candidates = await prisma.lead.findMany({
        where: {
          phone: { contains: last4 },
        },
        include: {
          assignedTo: { select: { id: true, name: true } },
        },
        take: 20,
      });

      for (const lead of candidates) {
        const leadDigits = lead.phone.replace(/\D/g, "");
        const leadNormalized = leadDigits.length >= 10 ? leadDigits.slice(-10) : leadDigits;

        if (leadNormalized === normalizedSearch) {
          return NextResponse.json(
            {
              error: "A lead with this phone number already exists.",
              isDuplicate: true,
              existingLead: {
                id: lead.id,
                fullName: lead.fullName,
                phone: lead.phone,
                email: lead.email,
                status: lead.status,
                source: lead.source,
                createdAt: lead.createdAt,
                assignedTo: lead.assignedTo?.name || "Unassigned",
              },
            },
            { status: 409 }
          );
        }
      }
    }

    const lead = await prisma.lead.create({
      data: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: cleanEmail,
        source,
        sourceDetails: sourceDetails?.trim() || null,
        status,
        cdlType,
        experienceYears: Number(experienceYears) || 0,
        endorsements: endorsements ? JSON.stringify(endorsements) : null,
        driverType: driverType || null,
        locationState: locationState?.trim().toUpperCase() || null,
        desiredPay: desiredPay?.trim() || null,
        notesText: notesText?.trim() || null,
        assignedToId: assignedToId || null,
      },
    });

    // If initial note provided
    if (initialNote && initialNote.trim()) {
      await prisma.note.create({
        data: {
          leadId: lead.id,
          content: initialNote.trim(),
          tag: "Initial Note",
          authorId: assignedToId || null,
        },
      });
    }

    // If initial reminder set
    if (reminderDueAt) {
      const parsedAdvance =
        reminderAdvanceMinutes !== undefined &&
        reminderAdvanceMinutes !== null &&
        !isNaN(Number(reminderAdvanceMinutes))
          ? Number(reminderAdvanceMinutes)
          : 15;

      await prisma.reminder.create({
        data: {
          leadId: lead.id,
          title: reminderTitle || `Follow-up with ${lead.fullName}`,
          dueAt: new Date(reminderDueAt),
          advanceMinutes: parsedAdvance,
          userId: assignedToId || null,
        },
      });
    }

    // Create activity log
    await prisma.activityLog.create({
      data: {
        leadId: lead.id,
        action: "LEAD_CREATED",
        details: `Lead created from ${source}`,
        userName: currentUserName,
      },
    });

    const fullLead = await prisma.lead.findUnique({
      where: { id: lead.id },
      include: {
        assignedTo: true,
        notes: { include: { author: true } },
        reminders: true,
        _count: { select: { notes: true, reminders: true } },
      },
    });

    serverCache.invalidateByPrefix("global_stats");
    return NextResponse.json(fullLead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadIds } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: "leadIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const deleteResult = await prisma.lead.deleteMany({
      where: {
        id: { in: leadIds },
      },
    });

    serverCache.invalidateByPrefix("global_stats");

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    console.error("Error bulk deleting leads:", error);
    return NextResponse.json(
      { error: "Failed to bulk delete leads" },
      { status: 500 }
    );
  }
}
