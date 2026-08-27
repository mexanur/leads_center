import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, role, password } = body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Recruiter not found" }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (email !== undefined) {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail !== existing.email) {
        const emailTaken = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (emailTaken) {
          return NextResponse.json(
            { error: "This email address is already in use" },
            { status: 409 }
          );
        }
        dataToUpdate.email = cleanEmail;
      }
    }
    if (role !== undefined) dataToUpdate.role = role;
    if (password && password.trim()) {
      dataToUpdate.password = await hashPassword(password.trim());
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: { leads: true, reminders: true, notes: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating recruiter:", error);
    return NextResponse.json(
      { error: "Failed to update recruiter" },
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
    const { searchParams } = new URL(request.url);
    const transferToId = searchParams.get("transferToId");

    const existing = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Recruiter not found" }, { status: 404 });
    }

    // If leads need to be transferred to another recruiter
    if (transferToId && transferToId !== id) {
      await prisma.lead.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: transferToId },
      });
      await prisma.reminder.updateMany({
        where: { userId: id },
        data: { userId: transferToId },
      });
    } else {
      // Unassign leads
      await prisma.lead.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null },
      });
      await prisma.reminder.updateMany({
        where: { userId: id },
        data: { userId: null },
      });
    }

    // Set authorId to null on notes if foreign key requires
    await prisma.note.updateMany({
      where: { authorId: id },
      data: { authorId: null },
    });

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Recruiter removed successfully" });
  } catch (error) {
    console.error("Error deleting recruiter:", error);
    return NextResponse.json(
      { error: "Failed to delete recruiter" },
      { status: 500 }
    );
  }
}
