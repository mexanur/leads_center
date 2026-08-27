import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabase, BUCKET_NAME } from "@/lib/supabase";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id: leadId, fileId } = await params;
    const { searchParams } = new URL(request.url);
    const currentUserName = searchParams.get("userName") || "Recruiter";

    const fileRecord = await prisma.leadFile.findUnique({
      where: { id: fileId },
    });

    if (!fileRecord || fileRecord.leadId !== leadId) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // 1. Delete from Supabase Storage
    if (fileRecord.filePath) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([fileRecord.filePath]);

      if (storageError) {
        console.warn("Notice deleting from Supabase storage:", storageError.message);
      }
    }

    // 2. Delete record from database
    await prisma.leadFile.delete({
      where: { id: fileId },
    });

    // 3. Log activity
    await prisma.activityLog.create({
      data: {
        leadId,
        action: "FILE_DELETED",
        details: `Deleted document: ${fileRecord.name}`,
        userName: currentUserName,
      },
    });

    return NextResponse.json({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting lead file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
