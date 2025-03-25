"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { jsPDF } from "jspdf";

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

interface ContentClipsProps {
  clips: ContentClip[];
  transcript?: TranscriptItem[];
  videoUrl?: string;
  videoTitle?: string;
  onReset: () => void;
}

export function ContentClips({ clips, transcript, videoUrl, videoTitle = "YouTube Video", onReset }: ContentClipsProps) {
  const [expandedClip, setExpandedClip] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleClip = (index: number) => {
    if (expandedClip === index) {
      setExpandedClip(null);
    } else {
      setExpandedClip(index);
    }
  };

  const handleSavePDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text("Content Clips Analysis", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Video: ${videoTitle}`, 20, 30);
    
    if (videoUrl) {
      doc.setFontSize(10);
      doc.text(`Source: ${videoUrl}`, 20, 40);
    }
    
    // Add clips
    let y = 50;
    clips.forEach((clip, index) => {
      // Add clip header
      doc.setFontSize(14);
      doc.text(`${index + 1}. ${clip.title}`, 20, y);
      y += 8;
      
      doc.setFontSize(10);
      doc.text(`Time: ${clip.startTimeFormatted} - ${clip.endTimeFormatted}`, 20, y);
      y += 6;
      
      // Add summary with word wrapping
      doc.setFontSize(11);
      const splitSummary = doc.splitTextToSize(`Summary: ${clip.summary}`, 170);
      doc.text(splitSummary, 20, y);
      y += splitSummary.length * 6 + 4;
      
      // Add reason with word wrapping
      const splitReason = doc.splitTextToSize(`Why it's engaging: ${clip.reason}`, 170);
      doc.text(splitReason, 20, y);
      y += splitReason.length * 6 + 10;
      
      // Add page break if needed
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });
    
    // Save PDF
    doc.save(`content-clips-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleSaveAnalysis = async () => {
    if (!transcript || !videoUrl) {
      setSaveError("Missing transcript or video URL data");
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);
      
      const response = await fetch("/api/save-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl,
          videoTitle: videoTitle || "Untitled Video",
          fullTranscript: transcript,
          contentClips: clips,
          analysisType: "content"
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save analysis");
      }
      
      setSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong while saving";
      setSaveError(errorMessage);
      console.error("Error saving analysis:", err);
    } finally {
      setSaving(false);
    }
  };

  const renderVideoLink = (startTime: number) => {
    if (!videoUrl) return null;
    
    try {
      const url = new URL(videoUrl);
      const videoId = url.searchParams.get('v');
      
      if (!videoId) return null;
      
      const startTimeSeconds = Math.floor(startTime / 1000);
      const youtubeTimeUrl = `https://www.youtube.com/watch?v=${videoId}&t=${startTimeSeconds}`;
      
      return (
        <a 
          href={youtubeTimeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm inline-flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
          Watch on YouTube
        </a>
      );
    } catch {
      return null;
    }
  };

  return (
    <div className="w-full animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold text-center mb-4">{videoTitle}</h1>
      <div className="mb-4 flex justify-end space-x-2">
        <Button
          onClick={onReset}
          variant="outline"
          size="sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Button>
        <Button
          onClick={onReset}
          variant="outline"
          size="sm"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </Button>
      </div>
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">Content Clips</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{videoUrl}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSavePDF}
              variant="outline"
              className="text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Save as PDF
            </Button>
            <Button
              onClick={handleSaveAnalysis}
              variant="outline"
              className="text-sm"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Analysis
                </span>
              )}
            </Button>
            <Button
              onClick={onReset}
              variant="ghost"
              className="text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
              Analyze Another Video
            </Button>
          </div>
        </CardHeader>
        
        {saveError && (
          <div className="px-6 mb-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {saveError}
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="px-6 mb-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              Analysis saved successfully!
            </div>
          </div>
        )}
        
        <CardContent>
          <div className="space-y-6">
            {clips.map((clip, index) => (
              <Card key={index} className="overflow-hidden">
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleClip(index)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        {clip.title}
                      </h3>
                      <span className="text-sm text-gray-500 block mb-2">
                        {clip.startTimeFormatted} - {clip.endTimeFormatted}
                      </span>
                      <p className="text-gray-700 mb-2">
                        {clip.summary}
                      </p>
                      <div className="mb-2">
                        {renderVideoLink(clip.startTime)}
                      </div>
                      <div className="text-sm text-gray-600 italic">
                        <span className="font-medium">Why it&apos;s engaging:</span> {clip.reason}
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-1 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleClip(index);
                      }}
                    >
                      <svg 
                        className={`w-5 h-5 transform transition-transform ${expandedClip === index ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </Button>
                  </div>
                </div>
                
                {expandedClip === index && (
                  <div className="p-4 bg-gray-50 border-t">
                    <h4 className="font-medium mb-2 text-sm">Full Transcript Segment:</h4>
                    <p className="text-sm text-gray-700">{clip.transcript}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-500 italic">
            These clips represent the most engaging moments from the transcript as determined by DeepSeek AI.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 