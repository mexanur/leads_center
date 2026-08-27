import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone") || "";
    const email = searchParams.get("email") || "";

    const rawDigits = phone.replace(/\D/g, "");
    const cleanEmail = email.toLowerCase().trim();

    if (!rawDigits && !cleanEmail) {
      return NextResponse.json({ exists: false });
    }

    // 1. Check by email first if present
    if (cleanEmail && cleanEmail.includes("@")) {
      const matchByEmail = await prisma.lead.findFirst({
        where: {
          email: {
            equals: cleanEmail,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          status: true,
          source: true,
          createdAt: true,
          assignedTo: {
            select: { id: true, name: true },
          },
        },
      });

      if (matchByEmail) {
        return NextResponse.json({
          exists: true,
          matchedBy: "email",
          lead: matchByEmail,
        });
      }
    }

    // 2. Check by phone digits if at least 7 digits provided
    if (rawDigits.length >= 7) {
      const last4 = rawDigits.slice(-4);
      // Find candidate leads that contain the last 4 digits
      const candidateLeads = await prisma.lead.findMany({
        where: {
          phone: {
            contains: last4,
          },
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          status: true,
          source: true,
          createdAt: true,
          assignedTo: {
            select: { id: true, name: true },
          },
        },
        take: 20,
      });

      const normalizedSearch = rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits;

      for (const lead of candidateLeads) {
        const leadDigits = lead.phone.replace(/\D/g, "");
        const leadNormalized = leadDigits.length >= 10 ? leadDigits.slice(-10) : leadDigits;

        if (leadNormalized === normalizedSearch) {
          return NextResponse.json({
            exists: true,
            matchedBy: "phone",
            lead,
          });
        }
      }
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Error checking duplicate lead:", error);
    return NextResponse.json(
      { error: "Failed to check duplicate" },
      { status: 500 }
    );
  }
}
