"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentClipSkeleton } from "./ContentClipSkeleton";
import { TopicSectionsSkeleton } from "./TopicSectionsSkeleton";
import { TopicSections } from "./TopicSections";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type TopicSection = {
  title: string;
  summary: string;
  startTime: number;
  endTime: number;
  startTimeFormatted: string;
  endTimeFormatted: string;
  transcript: string;
};

interface TranscriptDisplayProps {
  transcript: TranscriptItem[];
  videoUrl: string;
  onReset: () => void;
  onContentExtracted: (contentClips: ContentClip[]) => void;
  onTopicsFetched: (topicSections: TopicSection[]) => void;
  onAnalyzingTopicsChange?: (analyzing: boolean) => void;
}

export function TranscriptDisplay({ 
  transcript, 
  videoUrl, 
  onReset, 
  onContentExtracted, 
  onTopicsFetched,
  onAnalyzingTopicsChange
}: TranscriptDisplayProps) {
  const [extracting, setExtracting] = useState(false);
  const [analyzingTopics, setAnalyzingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [numClips, setNumClips] = useState(5);
  const [topicSections, setTopicSections] = useState<TopicSection[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Format time from milliseconds to MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const openExtractDialog = () => {
    setDialogOpen(true);
  };

  const handleExtractContent = async () => {
    try {
      setDialogOpen(false);
      setExtracting(true);
      setError(null);
      
      const response = await fetch("/api/extract-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          transcript,
          numClips: numClips 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract content");
      }
      
      const data = await response.json();
      onContentExtracted(data.contentClips);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong while extracting content";
      setError(errorMessage);
      console.error("Error extracting content:", err);
    } finally {
      setExtracting(false);
    }
  };

  const handleGetTopics = async () => {
    try {
      // Tell parent we're analyzing topics
      if (onAnalyzingTopicsChange) {
        onAnalyzingTopicsChange(true);
      }
      
      setAnalyzingTopics(true);
      setError(null);
      
      const response = await fetch("/api/get-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          transcript
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze topics");
      }
      
      const data = await response.json();
      setTopicSections(data.topicSections);
      onTopicsFetched(data.topicSections);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong while analyzing topics";
      setError(errorMessage);
      console.error("Error analyzing topics:", err);
      
      // Tell parent we're no longer analyzing topics
      if (onAnalyzingTopicsChange) {
        onAnalyzingTopicsChange(false);
      }
      
      setAnalyzingTopics(false);
    }
  };

  // Extract video title from URL (basic implementation)
  const getVideoTitle = () => {
    try {
      const urlObj = new URL(videoUrl);
      const videoId = urlObj.searchParams.get('v');
      return `YouTube Video ${videoId || ''}`;
    } catch {
      return "YouTube Video";
    }
  };

  const handleSaveTranscriptAsPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text("Video Transcript", 20, 20);
    
    const videoTitle = getVideoTitle();
    if (videoTitle) {
      doc.setFontSize(12);
      doc.text(`Video: ${videoTitle}`, 20, 30);
    }
    
    if (videoUrl) {
      doc.setFontSize(10);
      doc.text(`Source: ${videoUrl}`, 20, 40);
    }
    
    // Add transcript items
    let y = 50;
    transcript.forEach(item => {
      // Add timestamp
      const timeFormatted = formatTime(item.offset);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`${timeFormatted}`, 20, y);
      
      // Add text with word wrapping
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(item.text, 170);
      doc.text(splitText, 40, y);
      
      y += splitText.length * 6 + 5;
      
      // Add page break if needed
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });
    
    // Save PDF
    doc.save(`transcript-${new Date().toISOString().slice(0, 10)}.pdf`);
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
          videoTitle: getVideoTitle(),
          fullTranscript: transcript,
          analysisType: "transcript"
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

  if (extracting) {
    return <ContentClipSkeleton />;
  }

  if (analyzingTopics) {
    if (topicSections) {
      return (
        <TopicSections 
          sections={topicSections}
          transcript={transcript}
          videoUrl={videoUrl}
          videoTitle={getVideoTitle()}
          onReset={onReset}
        />
      );
    }
    return <TopicSectionsSkeleton />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-500 transcript-display">
      <h1 className="text-2xl font-bold text-center mb-4">{getVideoTitle()}</h1>
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
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-2xl font-semibold">Video Transcript</CardTitle>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={handleGetTopics}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-medium"
            >
              <span className="flex items-center">
                <svg 
                  className="w-4 h-4 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Get Topics
              </span>
            </Button>
            <Button 
              onClick={openExtractDialog}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium extract-content-button"
            >
              <span className="flex items-center">
                <svg 
                  className="w-4 h-4 mr-2" 
                  fill="currentColor" 
                  viewBox="0 0 24 24" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M21.928 11.607c-.202-.488-.635-.605-.928-.633V8c0-1.103-.897-2-2-2h-6V4.61c.305-.274.5-.668.5-1.11a1.5 1.5 0 0 0-3 0c0 .442.195.836.5 1.11V6H5c-1.103 0-2 .897-2 2v2.997l-.082.006A1 1 0 0 0 1.99 12v2a1 1 0 0 0 1 1H3v5c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-5a1 1 0 0 0 1-1v-1.938a1.006 1.006 0 0 0-.072-.455zM5 20V8h14l.001 3.996L19 12v2l.001.005.001 5.995H5z"/>
                  <ellipse cx="8.5" cy="12" rx="1.5" ry="2"/>
                  <ellipse cx="15.5" cy="12" rx="1.5" ry="2"/>
                  <path d="M8 16h8v2H8z"/>
                </svg>
                Extract Content with DeepSeek AI
              </span>
            </Button>
            <Button
              onClick={handleSaveTranscriptAsPDF}
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
          </div>
        </CardHeader>
        
        {error && (
          <div className="px-6 mb-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        )}
        
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
        
        <CardContent className="max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            {transcript.map((item, index) => (
              <div 
                key={index} 
                className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-500">
                    {formatTime(item.offset)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {item.duration / 1000}s
                  </span>
                </div>
                <p className="text-gray-800">{item.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={onReset}
            className="w-full"
            variant="outline"
          >
            Analyze Another Video
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Extract Content Clips</DialogTitle>
            <DialogDescription>
              Select how many short-form content clips you want to extract from the transcript.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="numClips" className="text-right">
                Number of clips
              </Label>
              <Input
                id="numClips"
                type="number"
                min="1"
                max="10"
                value={numClips}
                onChange={(e) => setNumClips(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                className="col-span-3"
              />
            </div>
            <div className="text-sm text-gray-500 italic">
              You can extract between 1 and 10 content clips. The AI will identify the most engaging moments from the transcript.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleExtractContent}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 