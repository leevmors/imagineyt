import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, fullTranscript, contentClips, topicSections, videoTitle, analysisType } = await request.json();
    
    if (!videoUrl || !fullTranscript || (!contentClips && !topicSections)) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    // For now, create a dummy user if needed (in a real app, you'd get the user from the session)
    let user = await prisma.user.findFirst();
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: "Demo User",
          email: "demo@example.com",
        },
      });
    }

    // Save the analysis
    const savedAnalysis = await prisma.transcriptAnalysis.create({
      data: {
        videoUrl,
        videoTitle: videoTitle || "Untitled Video",
        fullTranscript: JSON.stringify(fullTranscript),
        contentClips: contentClips ? JSON.stringify(contentClips) : null,
        topicSections: topicSections ? JSON.stringify(topicSections) : null,
        analysisType: analysisType || "content", // 'content' or 'topics'
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, analysisId: savedAnalysis.id });
  } catch (error: unknown) {
    console.error("Error saving analysis:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to save analysis";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 