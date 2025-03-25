import { NextRequest, NextResponse } from "next/server";
import { deepseekInstructions } from "@/lib/deepseekInstructions";

type TranscriptItem = {
  text: string;
  offset: number;
  duration: number;
};

type ContentClip = {
  title: string;
  summary: string;
  startTime: number;
  endTime: number;
  startTimeFormatted: string;
  endTimeFormatted: string;
  transcript: string;
  reason: string;
};

export async function POST(request: NextRequest) {
  try {
    const { transcript, numClips = 5 } = await request.json();
    
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { error: "Invalid transcript data" },
        { status: 400 }
      );
    }

    // Validate number of clips
    const clipCount = Math.min(10, Math.max(1, Number(numClips) || 5));

    // Format the transcript for the AI
    const fullTranscript = formatTranscriptForAI(transcript);
    
    // Generate content clips using DeepSeek AI
    const contentClips = await generateContentClips(fullTranscript, transcript, clipCount);
    
    return NextResponse.json({ contentClips });
  } catch (error: unknown) {
    console.error("Error generating content clips:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate content clips";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

function formatTranscriptForAI(transcript: TranscriptItem[]): string {
  return transcript.map(item => {
    const timeInSeconds = Math.floor(item.offset / 1000);
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    return `[${timeFormatted}] ${item.text}`;
  }).join('\n');
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

interface ClipData {
  title: string;
  summary: string;
  startTimestamp: string;
  endTimestamp: string;
  reason: string;
  start_timestamp?: string;
  end_timestamp?: string;
}

function validateClipsArray(parsedData: unknown): boolean {
  if (!Array.isArray(parsedData)) {
    console.error("Parsed data is not an array:", parsedData);
    return false;
  }

  if (parsedData.length === 0) {
    console.error("Parsed data is an empty array");
    return false;
  }

  // Check if each item has the required properties
  const requiredProps = ['title', 'summary', 'startTimestamp', 'endTimestamp', 'reason'];
  
  for (const clip of parsedData) {
    for (const prop of requiredProps) {
      if (!(prop in clip) || typeof clip[prop] !== 'string' || !clip[prop]) {
        console.error(`Clip missing or has invalid ${prop}:`, clip);
        return false;
      }
    }
    
    // Validate timestamp format (MM:SS)
    const timestampRegex = /^\d{1,2}:\d{2}$/;
    if (!timestampRegex.test(clip.startTimestamp) || !timestampRegex.test(clip.endTimestamp)) {
      console.error(`Invalid timestamp format in clip:`, clip);
      return false;
    }
  }
  
  return true;
}

async function generateContentClips(
  formattedTranscript: string,
  originalTranscript: TranscriptItem[],
  numClips: number = 5
): Promise<ContentClip[]> {
  // Get the API key from environment variables
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    console.warn("DeepSeek API key is not configured, using fallback content clips");
    return generateFallbackContentClips(originalTranscript, numClips);
  }
  
  // Create the prompt for the AI
  const prompt = `${deepseekInstructions}

Please extract exactly ${numClips} short-form content clips from the transcript.

Here is the transcript (with timestamps):
${formattedTranscript}

IMPORTANT: You must respond ONLY with a valid JSON array (not an object) containing ${numClips} clip objects with this structure:
[
  {
    "title": "Catchy title for the clip",
    "summary": "Brief description of the clip content",
    "startTimestamp": "MM:SS",
    "endTimestamp": "MM:SS",
    "reason": "Why this clip would perform well as short-form content"
  }
]

DO NOT include any explanations, markdown formatting, or text outside of the JSON array. Your response must be a valid JSON array that can be parsed directly.`;

  try {
    // Make the API request to DeepSeek AI
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-coder",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant that specializes in analyzing video transcripts and extracting engaging clips for short-form content. Your responses should be in valid JSON array format only. DO NOT wrap your response in code blocks or add any explanations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,  // Lower temperature for more consistent structured output
        max_tokens: 4000,
        top_p: 0.95,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to get response from DeepSeek AI");
    }

    const data = await response.json();
    console.log("DeepSeek API Response:", JSON.stringify(data, null, 2));
    
    const aiResponse = data.choices[0].message.content;
    console.log("AI Response content:", aiResponse);
    
    // Parse the JSON response from the AI
    let parsedClips;
    try {
      // Try to match JSON array patterns in case there's markdown or text wrapping
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          parsedClips = JSON.parse(jsonMatch[0]);
        } catch (jsonErr) {
          console.error("Failed to parse matched JSON array:", jsonErr);
          throw jsonErr;
        }
      } else {
        parsedClips = JSON.parse(aiResponse);
      }
      
      // Validate the parsed clips
      const isValid = validateClipsArray(parsedClips);
      
      if (!isValid) {
        console.error("Invalid clips format, attempting to extract or use fallback");
        
        // Attempt to extract array from object if needed
        if (parsedClips && !Array.isArray(parsedClips)) {
          // Check for common properties that might contain the array
          if (Array.isArray(parsedClips.clips)) {
            parsedClips = parsedClips.clips;
          } else if (Array.isArray(parsedClips.contentClips)) {
            parsedClips = parsedClips.contentClips;
          } else if (Array.isArray(parsedClips.results)) {
            parsedClips = parsedClips.results;
          } else {
            // If we can't find an array property, extract the first array we find
            const firstArrayProp = Object.values(parsedClips).find(value => Array.isArray(value));
            if (firstArrayProp) {
              parsedClips = firstArrayProp;
            } else {
              throw new Error("Could not extract valid clips array");
            }
          }
          
          // Validate again after extraction
          if (!validateClipsArray(parsedClips)) {
            throw new Error("Extracted array is not valid");
          }
        } else {
          throw new Error("Invalid clips format and not an object");
        }
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      console.error("Raw AI response:", aiResponse);
      
      // Try to extract JSON from code blocks as a last resort
      try {
        const codeBlockMatch = aiResponse.match(/```(?:json)?([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          const trimmedJson = codeBlockMatch[1].trim();
          parsedClips = JSON.parse(trimmedJson);
          
          if (!validateClipsArray(parsedClips)) {
            throw new Error("Extracted code block contains invalid data");
          }
        } else {
          throw new Error("No valid JSON found in response");
        }
      } catch (innerError) {
        console.error("All parsing attempts failed:", innerError);
        throw new Error("Failed to parse content clips from AI response");
      }
    }
    
    // Process the AI response to get full clips with transcript text
    const contentClips = processAIResponse(parsedClips, originalTranscript);
    return contentClips;
  } catch (error) {
    console.error("Error calling DeepSeek API:", error);
    // Use fallback content clips if the API fails
    return generateFallbackContentClips(originalTranscript, numClips);
  }
}

function processAIResponse(
  aiClips: ClipData[],
  originalTranscript: TranscriptItem[]
): ContentClip[] {
  return aiClips.map(clip => {
    try {
      // Safely extract timestamp strings, handling different formats
      let startTimestamp = clip.startTimestamp || clip.start_timestamp || "00:00";
      let endTimestamp = clip.endTimestamp || clip.end_timestamp || "00:30";
      
      // Clean up timestamp formats
      if (typeof startTimestamp === 'string') {
        startTimestamp = startTimestamp.replace(/[\[\]]/g, '');
      }
      
      if (typeof endTimestamp === 'string') {
        endTimestamp = endTimestamp.replace(/[\[\]]/g, '');
      }
      
      // Split and parse the time parts
      let startTimeMs = 0;
      let endTimeMs = 30000; // Default 30 seconds
      
      try {
        const startTimeParts = startTimestamp.split(":");
        startTimeMs = ((parseInt(startTimeParts[0]) * 60) + parseInt(startTimeParts[1])) * 1000;
      } catch (err) {
        console.error("Error parsing start timestamp:", startTimestamp, err);
      }
      
      try {
        const endTimeParts = endTimestamp.split(":");
        endTimeMs = ((parseInt(endTimeParts[0]) * 60) + parseInt(endTimeParts[1])) * 1000;
      } catch (err) {
        console.error("Error parsing end timestamp:", endTimestamp, err);
        // If start time was parsed successfully, set end time to 30 seconds later
        if (startTimeMs > 0) {
          endTimeMs = startTimeMs + 30000;
        }
      }
      
      // Handle invalid timestamps by using a reasonable default if needed
      if (isNaN(startTimeMs) || startTimeMs < 0) {
        console.warn("Invalid start time, using default:", startTimestamp);
        startTimeMs = 0;
      }
      
      if (isNaN(endTimeMs) || endTimeMs <= startTimeMs) {
        console.warn("Invalid end time, using default:", endTimestamp);
        endTimeMs = startTimeMs + 30000;
      }
      
      // Extract the relevant transcript text
      const clipTranscript = originalTranscript
        .filter(item => item.offset >= startTimeMs && item.offset <= endTimeMs)
        .map(item => item.text)
        .join(" ");
      
      // Use default values for any missing properties
      return {
        title: clip.title || "Untitled Clip",
        summary: clip.summary || "No summary provided",
        startTime: startTimeMs,
        endTime: endTimeMs,
        startTimeFormatted: formatTime(startTimeMs),
        endTimeFormatted: formatTime(endTimeMs),
        transcript: clipTranscript || "No transcript content available for this timestamp range",
        reason: clip.reason || "This clip was selected based on engaging content potential"
      };
    } catch (err) {
      console.error("Error processing clip:", clip, err);
      // Return a fallback clip with default values
      return {
        title: "Content Clip",
        summary: "Unable to process this clip properly",
        startTime: 0,
        endTime: 30000,
        startTimeFormatted: "00:00",
        endTimeFormatted: "00:30",
        transcript: "Error processing transcript for this clip",
        reason: "This is a fallback clip due to processing errors"
      };
    }
  });
}

// Function to generate fallback content clips if the API fails
function generateFallbackContentClips(transcript: TranscriptItem[], numClips: number = 5): ContentClip[] {
  if (!transcript || transcript.length === 0) {
    return [{
      title: "No Content Available",
      summary: "Unable to generate content clips from the transcript.",
      startTime: 0,
      endTime: 30000,
      startTimeFormatted: "00:00",
      endTimeFormatted: "00:30",
      transcript: "No transcript content available",
      reason: "This is a fallback clip due to processing errors"
    }];
  }
  
  const clips: ContentClip[] = [];
  const transcriptLength = transcript.length;
  
  // Calculate optimal clip distribution
  const segmentSize = Math.floor(transcriptLength / Math.min(numClips, 5));
  const clipLengthItems = Math.min(15, Math.floor(segmentSize / 2)); // Length of each clip in transcript items
  
  // Create a list of potential starting points spread throughout the transcript
  const startPoints: number[] = [];
  for (let i = 0; i < numClips * 2 && i * segmentSize < transcriptLength; i++) {
    startPoints.push(i * segmentSize);
  }
  
  // Try to find segments that contain more words (might be more content-rich)
  startPoints.sort((a, b) => {
    const aText = transcript.slice(a, Math.min(a + 5, transcriptLength)).map(item => item.text).join(" ");
    const bText = transcript.slice(b, Math.min(b + 5, transcriptLength)).map(item => item.text).join(" ");
    return bText.split(" ").length - aText.split(" ").length;
  });
  
  // Take the top N start points
  const selectedStartPoints = startPoints.slice(0, numClips);
  
  // Sort them back in chronological order
  selectedStartPoints.sort((a, b) => a - b);
  
  // Generate clips
  for (let i = 0; i < selectedStartPoints.length && clips.length < numClips; i++) {
    const startIndex = selectedStartPoints[i];
    const endIndex = Math.min(startIndex + clipLengthItems, transcriptLength - 1);
    
    if (startIndex >= transcriptLength) continue;
    
    const startTime = transcript[startIndex].offset;
    const endTime = transcript[endIndex].offset + transcript[endIndex].duration;
    
    const clipTextItems = transcript.slice(startIndex, endIndex + 1);
    const clipText = clipTextItems.map(item => item.text).join(" ");
    
    // Skip very short clips
    if (clipText.split(" ").length < 5) continue;
    
    // Generate title
    // Find frequent meaningful words to use in the title
    const words = clipText.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'these', 'those', 'then', 'than', 'when', 'what', 'with'].includes(word));
    
    // Count word frequency
    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Sort by frequency
    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
    
    // Create a title from the most frequent words, or use the first sentence if there are no frequent words
    let title = "";
    if (sortedWords.length > 0) {
      title = `"${sortedWords.join(" ")}" - Key Insight`;
    } else {
      // Use first sentence or part of text
      const firstSentence = clipText.split(/[.!?]/)
        .filter(s => s.trim().length > 0)[0] || "";
      title = firstSentence.length > 30 
        ? `${firstSentence.substring(0, 30)}...` 
        : firstSentence;
    }
    
    // Create a meaningful summary based on content analysis
    let summary = "";
    const wordCount = clipText.split(" ").length;
    
    if (wordCount > 20) {
      // Create summary from first and last sentence for context
      const sentences = clipText.split(/[.!?]/).filter(s => s.trim().length > 0);
      if (sentences.length > 1) {
        summary = `This clip covers ${sentences[0].trim()} and concludes with ${sentences[sentences.length - 1].trim()}.`;
      } else {
        summary = `This clip discusses ${clipText.substring(0, 100)}...`;
      }
    } else {
      summary = `Brief point about ${clipText}`;
    }
    
    // Generate a relevant reason why this clip would be engaging
    const reasons = [
      `This segment contains a concise explanation that would resonate with viewers looking for quick insights.`,
      `The content in this clip delivers a focused point that would engage viewers interested in this topic.`,
      `This clip captures a moment that effectively communicates a key concept in an accessible way.`,
      `This segment has a natural flow and covers a complete thought, making it ideal for short-form content.`,
      `This portion of the transcript contains a standalone insight that works well without additional context.`
    ];
    
    // Select a reason that's most appropriate based on clip characteristics
    let reasonIndex = Math.floor(startIndex / transcriptLength * reasons.length);
    reasonIndex = Math.min(reasonIndex, reasons.length - 1);
    
    clips.push({
      title,
      summary,
      startTime,
      endTime,
      startTimeFormatted: formatTime(startTime),
      endTimeFormatted: formatTime(endTime),
      transcript: clipText,
      reason: reasons[reasonIndex]
    });
  }
  
  // If we couldn't generate enough clips, add some more
  while (clips.length < numClips && transcript.length > 0) {
    const randomStart = Math.floor(Math.random() * Math.max(1, transcript.length - clipLengthItems));
    const randomEnd = Math.min(randomStart + clipLengthItems, transcript.length - 1);
    
    const startTime = transcript[randomStart].offset;
    const endTime = transcript[randomEnd].offset + transcript[randomEnd].duration;
    const clipText = transcript.slice(randomStart, randomEnd + 1).map(item => item.text).join(" ");
    
    const randomTitleWords = clipText.split(" ")
      .filter(word => word.length > 3)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    
    const title = randomTitleWords.length > 0 
      ? `"${randomTitleWords.join(" ")}" - Interesting Moment` 
      : "Notable Segment";
    
    clips.push({
      title,
      summary: `This clip presents an interesting perspective from ${formatTime(startTime)} to ${formatTime(endTime)}.`,
      startTime,
      endTime,
      startTimeFormatted: formatTime(startTime),
      endTimeFormatted: formatTime(endTime),
      transcript: clipText,
      reason: "This segment contains meaningful content that provides value in a concise format, ideal for short-form platforms."
    });
  }
  
  return clips.slice(0, numClips);
} 