import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { supabase, BUCKET_NAME } from "@/lib/supabase";
import { FILE_CATEGORY_CONFIG } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const files = await prisma.leadFile.findMany({
      where: { leadId: id },
      orderBy: { createdAt: "desc" },
      include: {
        uploader: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("Error fetching lead files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const rawFiles = formData.getAll("files") as File[];
    const fallbackFile = formData.get("file") as File | null;
    const files = rawFiles.length > 0 ? rawFiles : fallbackFile ? [fallbackFile] : [];
    const fileType = (formData.get("fileType") as string) || "OTHER";
    const userId = formData.get("userId") as string | null;
    const currentUserName = (formData.get("currentUserName") as string) || "Recruiter";

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Please select one or more files to upload" },
        { status: 400 }
      );
    }

    // Check size limit: 25 MB max per file
    const MAX_SIZE = 25 * 1024 * 1024;
    for (const f of files) {
      if (f.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `File "${f.name}" exceeds maximum limit of 25MB` },
          { status: 400 }
        );
      }
    }

    const categoryLabel = FILE_CATEGORY_CONFIG[fileType]?.label || fileType;
    const createdFiles = [];

    for (const file of files) {
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `leads/${leadId}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${sanitizedFileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage bucket with 24h browser cacheControl
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          cacheControl: "86400",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Supabase Storage upload error for ${file.name}:`, uploadError);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      const fileUrl = urlData.publicUrl;

      // Save record to DB
      const leadFile = await prisma.leadFile.create({
        data: {
          leadId,
          name: file.name,
          fileUrl,
          filePath: storagePath,
          fileType,
          fileSize: file.size,
          mimeType: file.type || null,
          uploaderId: userId || null,
        },
        include: {
          uploader: { select: { id: true, name: true } },
        },
      });

      createdFiles.push(leadFile);
    }

    if (createdFiles.length === 0) {
      return NextResponse.json(
        { error: "Failed to upload files to storage" },
        { status: 500 }
      );
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        leadId,
        action: createdFiles.length > 1 ? "BULK_FILES_UPLOADED" : "FILE_UPLOADED",
        details:
          createdFiles.length > 1
            ? `Uploaded ${createdFiles.length} documents (${categoryLabel}): ${createdFiles.map((f) => f.name).slice(0, 3).join(", ")}${createdFiles.length > 3 ? "..." : ""}`
            : `Uploaded document: ${categoryLabel} (${createdFiles[0].name})`,
        userName: currentUserName,
      },
    });

    return NextResponse.json(
      {
        success: true,
        uploadedCount: createdFiles.length,
        files: createdFiles,
        file: createdFiles[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading lead files:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
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
    const { fileIds, currentUserName = "Recruiter" } = body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: "No file IDs provided for deletion" },
        { status: 400 }
      );
    }

    // 1. Fetch file records to get their storage paths
    const files = await prisma.leadFile.findMany({
      where: {
        id: { in: fileIds },
        leadId,
      },
      select: {
        id: true,
        name: true,
        filePath: true,
      },
    });

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No matching files found" },
        { status: 404 }
      );
    }

    // 2. Remove all file paths from Supabase Storage
    const storagePaths = files.map((f) => f.filePath).filter(Boolean);
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(storagePaths);

      if (storageError) {
        console.warn("Supabase bulk storage delete warning:", storageError.message);
      }
    }

    // 3. Delete records from Database
    const matchedIds = files.map((f) => f.id);
    await prisma.leadFile.deleteMany({
      where: {
        id: { in: matchedIds },
        leadId,
      },
    });

    // 4. Log activity
    await prisma.activityLog.create({
      data: {
        leadId,
        action: "BULK_FILES_DELETED",
        details: `Bulk deleted ${files.length} document(s): ${files.map((f) => f.name).slice(0, 3).join(", ")}${files.length > 3 ? "..." : ""}`,
        userName: currentUserName,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: files.length,
      deletedIds: matchedIds,
    });
  } catch (error) {
    console.error("Error bulk deleting lead files:", error);
    return NextResponse.json(
      { error: "Failed to delete files" },
      { status: 500 }
    );
  }
}
