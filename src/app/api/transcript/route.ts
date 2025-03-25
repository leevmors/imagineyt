import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { videoUrl } = await request.json();
    
    // Extract video ID from the URL
    const videoId = extractVideoId(videoUrl);
    
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }
    
    // Get transcript with timecodes
    const transcript = await fetchTranscript(videoId);
    
    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { error: "No transcript found for this video" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ transcript });
  } catch (error: unknown) {
    console.error("Error fetching transcript:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch transcript";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Helper function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  
  return (match && match[2].length === 11) ? match[2] : null;
}

// Function to fetch transcript from YouTube
async function fetchTranscript(videoId: string) {
  try {
    // First, we need to get the video page to find the available transcript tracks
    const videoPageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const videoPageHtml = await videoPageResponse.text();
    
    // Extract the serializedShareEntity which contains data we need
    const dataRegex = /"playerCaptionsTracklistRenderer":({.*?}),"/g;
    const match = dataRegex.exec(videoPageHtml);
    
    if (!match || !match[1]) {
      throw new Error("No transcript data found");
    }
    
    // Find the caption track URL
    const captionRegex = /"baseUrl":"(.*?)"/g;
    const captionMatch = captionRegex.exec(match[1].replace(/\\u0026/g, '&'));
    
    if (!captionMatch || !captionMatch[1]) {
      throw new Error("No caption URL found");
    }
    
    // Fetch the transcript XML
    const transcriptUrl = captionMatch[1];
    const transcriptResponse = await fetch(transcriptUrl);
    const transcriptXml = await transcriptResponse.text();
    
    // Parse the XML to extract transcript segments with timecodes
    const transcriptItems = parseTranscriptXml(transcriptXml);
    
    return transcriptItems;
  } catch (error: unknown) {
    console.error("Error fetching transcript:", error);
    throw error;
  }
}

// Function to parse the transcript XML
function parseTranscriptXml(xml: string) {
  const transcript: Array<{ text: string, offset: number, duration: number }> = [];
  
  // Simple regex-based parsing
  const textRegex = /<text start="([\d\.]+)" dur="([\d\.]+)"(?:[^>]*)>(.*?)<\/text>/g;
  let match;
  
  while ((match = textRegex.exec(xml)) !== null) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    // Decode HTML entities
    const text = decodeHtmlEntities(match[3]);
    
    transcript.push({
      text,
      offset: Math.floor(start * 1000), // Convert to milliseconds
      duration: Math.floor(duration * 1000), // Convert to milliseconds
    });
  }
  
  return transcript;
}

// Function to decode HTML entities
function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>/g, ''); // Remove any HTML tags
} 