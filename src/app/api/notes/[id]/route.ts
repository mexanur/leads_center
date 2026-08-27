import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, tag, currentUserName = "Recruiter" } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Note content cannot be empty" },
        { status: 400 }
      );
    }

    const existingNote = await prisma.note.findUnique({
      where: { id },
      select: { id: true, leadId: true, content: true, tag: true },
    });

    if (!existingNote) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    const updatedNote = await prisma.note.update({
      where: { id },
      data: {
        content: content.trim(),
        tag: tag !== undefined ? (tag ? tag.trim() : null) : existingNote.tag,
        updatedAt: new Date(),
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Record activity log
    await prisma.activityLog.create({
      data: {
        leadId: existingNote.leadId,
        action: "NOTE_EDITED",
        details: tag
          ? `Note edited [${tag}]: ${content.slice(0, 60)}...`
          : `Note edited: ${content.slice(0, 60)}...`,
        userName: currentUserName,
      },
    });

    // Touch lead updatedAt
    await prisma.lead.update({
      where: { id: existingNote.leadId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
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
    await prisma.note.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
