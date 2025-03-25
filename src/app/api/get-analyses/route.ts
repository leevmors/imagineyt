import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Define a more complete type that includes the new fields
type ExtendedTranscriptAnalysis = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  videoUrl: string;
  videoTitle: string | null;
  fullTranscript: string;
  contentClips: string | null;
  topicSections: string | null;
  analysisType: string;
  userId: string | null;
};

export async function GET() {
  try {
    // For a real app, you'd get the user ID from the session
    // For now, we'll fetch all analyses
    const analyses = await prisma.transcriptAnalysis.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      // Use select with all fields to satisfy TypeScript
      select: {
        id: true,
        videoUrl: true,
        videoTitle: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        // Even if Prisma types don't know about these yet, they exist in DB
        fullTranscript: true,
        contentClips: true,
      }
    }) as unknown as ExtendedTranscriptAnalysis[];

    return NextResponse.json({ analyses });
  } catch (error: unknown) {
    console.error("Error fetching analyses:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch analyses";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: "Missing analysis ID" },
        { status: 400 }
      );
    }

    const analysis = await prisma.transcriptAnalysis.findUnique({
      where: { id },
    }) as unknown as ExtendedTranscriptAnalysis;

    if (!analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Parse the JSON strings back to objects
    const parsedAnalysis = {
      ...analysis,
      fullTranscript: JSON.parse(analysis.fullTranscript),
      // Only parse if the fields exist and aren't null
      contentClips: analysis.contentClips ? JSON.parse(analysis.contentClips) : null,
      topicSections: analysis.topicSections ? JSON.parse(analysis.topicSections) : null
    };

    return NextResponse.json({ analysis: parsedAnalysis });
  } catch (error: unknown) {
    console.error("Error fetching analysis detail:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch analysis";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 