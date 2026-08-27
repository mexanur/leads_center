import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, tag, authorId, currentUserName = "Recruiter" } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        leadId: id,
        content: content.trim(),
        tag: tag || null,
        authorId: authorId || null,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Also record activity log
    await prisma.activityLog.create({
      data: {
        leadId: id,
        action: "NOTE_ADDED",
        details: tag ? `Note added [${tag}]: ${content.slice(0, 60)}...` : `Note added: ${content.slice(0, 60)}...`,
        userName: currentUserName,
      },
    });

    // Touch lead updatedAt
    await prisma.lead.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
