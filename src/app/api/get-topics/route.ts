import { NextRequest, NextResponse } from "next/server";

type TranscriptItem = {
  text: string;
  offset: number;
  duration: number;
};

type TopicSection = {
  title: string;
  summary: string;
  startTime: number;
  endTime: number;
  startTimeFormatted: string;
  endTimeFormatted: string;
  transcript: string;
};

interface TopicSectionData {
  title: string;
  summary: string;
  startTimestamp: string;
  endTimestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();
    
    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return NextResponse.json(
        { error: "Invalid transcript data" },
        { status: 400 }
      );
    }

    // Format the transcript for the AI
    const fullTranscript = formatTranscriptForAI(transcript);
    
    // Generate topic sections using DeepSeek AI
    const topicSections = await generateTopicSections(fullTranscript, transcript);
    
    return NextResponse.json({ topicSections });
  } catch (error: unknown) {
    console.error("Error generating topic sections:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze transcript";
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

function validateTopicsArray(parsedData: unknown): boolean {
  if (!Array.isArray(parsedData)) {
    console.error("Parsed data is not an array:", parsedData);
    return false;
  }

  if (parsedData.length === 0) {
    console.error("Parsed data is an empty array");
    return false;
  }

  // Check if each item has the required properties
  const requiredProps = ['title', 'summary', 'startTimestamp', 'endTimestamp'];
  
  for (const section of parsedData) {
    for (const prop of requiredProps) {
      if (!(prop in section) || typeof section[prop] !== 'string' || !section[prop]) {
        console.error(`Section missing or has invalid ${prop}:`, section);
        return false;
      }
    }
    
    // Validate timestamp format (MM:SS)
    const timestampRegex = /^\d{1,2}:\d{2}$/;
    if (!timestampRegex.test(section.startTimestamp) || !timestampRegex.test(section.endTimestamp)) {
      console.error(`Invalid timestamp format in section:`, section);
      return false;
    }
  }
  
  return true;
}

async function generateTopicSections(
  formattedTranscript: string,
  originalTranscript: TranscriptItem[]
): Promise<TopicSection[]> {
  // Get the API key from environment variables
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error("DeepSeek API key is not configured");
  }
  
  // Create the prompt for the AI
  const prompt = `
# How to Break Down This Video

## Your Job
Look at the video's transcript and divide it into clear sections with time stamps.

## What You Need to Do
1. Find the main topics in the video
2. Give each section a simple, clear title
3. Write a short, easy-to-understand summary for each section
4. Add the exact start and end times for each section
5. Make sure you cover the whole video from start to finish
6. Double-check your time stamps and summaries

Here is the transcript (with timestamps):
${formattedTranscript}

IMPORTANT: Your answer should ONLY be a simple JSON array with this structure:
[
  {
    "title": "Short, clear title for this part",
    "summary": "Simple explanation of what happens in this part of the video",
    "startTimestamp": "MM:SS",
    "endTimestamp": "MM:SS"
  }
]

Don't add any extra text, markdown, or explanations - just the JSON array.`;

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
            content: "You're an assistant that helps break down videos into simple sections with time stamps. Keep your language simple and clear. Make your summaries easy to understand, like you're explaining to a friend. Only reply with JSON - no extra text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,  // Lower temperature for more consistent structured output
        max_tokens: 4000,
        top_p: 0.95
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to get response from DeepSeek AI");
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse the JSON response from the AI
    let parsedSections;
    try {
      // Try to match JSON array patterns in case there's markdown or text wrapping
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedSections = JSON.parse(jsonMatch[0]);
      } else {
        parsedSections = JSON.parse(aiResponse);
      }
      
      // Validate the parsed sections
      const isValid = validateTopicsArray(parsedSections);
      
      if (!isValid) {
        throw new Error("Invalid sections format from AI response");
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      
      // Try to extract JSON from code blocks as a last resort
      const codeBlockMatch = aiResponse.match(/```(?:json)?([\s\S]*?)```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        const trimmedJson = codeBlockMatch[1].trim();
        parsedSections = JSON.parse(trimmedJson);
        
        if (!validateTopicsArray(parsedSections)) {
          throw new Error("Extracted code block contains invalid data");
        }
      } else {
        throw new Error("Failed to parse topic sections from AI response");
      }
    }
    
    // Process the AI response to get full sections with transcript text
    return processAIResponse(parsedSections, originalTranscript);
  } catch (error: unknown) {
    console.error("Error calling DeepSeek API:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to analyze transcript";
    throw new Error(`Failed to analyze transcript: ${errorMessage}`);
  }
}

function timestampToMs(timestamp: string): number {
  const [minutesStr, secondsStr] = timestamp.split(':');
  const minutes = parseInt(minutesStr, 10);
  const seconds = parseInt(secondsStr, 10);
  return (minutes * 60 + seconds) * 1000;
}

function processAIResponse(
  aiSections: TopicSectionData[],
  originalTranscript: TranscriptItem[]
): TopicSection[] {
  return aiSections.map(section => {
    const startTime = timestampToMs(section.startTimestamp);
    const endTime = timestampToMs(section.endTimestamp);
    
    // Get the transcript text for this section
    const sectionTranscript = originalTranscript
      .filter(item => {
        const itemTime = item.offset;
        return itemTime >= startTime && itemTime <= endTime;
      })
      .map(item => item.text)
      .join(" ");
    
    return {
      title: section.title,
      summary: section.summary,
      startTime,
      endTime,
      startTimeFormatted: section.startTimestamp,
      endTimeFormatted: section.endTimestamp,
      transcript: sectionTranscript
    };
  });
} 