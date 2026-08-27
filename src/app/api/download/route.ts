import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get("url");
    const fileName = searchParams.get("name") || "download";

    if (!fileUrl) {
      return NextResponse.json({ error: "File URL is required" }, { status: 400 });
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch file from storage" }, { status: 500 });
    }

    const blob = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    const cleanFileName = fileName.replace(/["\r\n]/g, "_");

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${cleanFileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}
