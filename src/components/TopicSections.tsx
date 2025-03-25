"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { jsPDF } from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

interface TopicSectionsProps {
  sections: TopicSection[];
  transcript?: TranscriptItem[];
  videoUrl?: string;
  videoTitle?: string;
  onReset: () => void;
  onExtractContent?: () => void;
}

export function TopicSections({ 
  sections, 
  transcript, 
  videoUrl, 
  videoTitle = "YouTube Video", 
  onReset,
  onExtractContent 
}: TopicSectionsProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [numClips, setNumClips] = useState(5);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const toggleSection = (index: number) => {
    if (expandedSection === index) {
      setExpandedSection(null);
    } else {
      setExpandedSection(index);
    }
  };

  const handleSavePDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text("Video Topic Analysis", 20, 20);
    
    if (videoTitle) {
      doc.setFontSize(12);
      doc.text(`Video: ${videoTitle}`, 20, 30);
    }
    
    if (videoUrl) {
      doc.setFontSize(10);
      doc.text(`Source: ${videoUrl}`, 20, 40);
    }
    
    // Add sections
    let y = 50;
    sections.forEach((section, index) => {
      // Add section header
      doc.setFontSize(14);
      doc.text(`${index + 1}. ${section.title} (${section.startTimeFormatted} - ${section.endTimeFormatted})`, 20, y);
      y += 10;
      
      // Add summary with word wrapping
      doc.setFontSize(10);
      const splitSummary = doc.splitTextToSize(section.summary, 170);
      doc.text(splitSummary, 20, y);
      
      y += splitSummary.length * 5 + 10;
      
      // Add page break if needed
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });
    
    // Save PDF
    doc.save(`topic-analysis-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const openExtractDialog = () => {
    setDialogOpen(true);
  };

  const handleExtractContent = () => {
    setDialogOpen(false);
    if (onExtractContent) {
      onExtractContent();
    }
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
          topicSections: sections,
          analysisType: "topics"
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
    <div className="w-full animate-in fade-in-50 duration-500">
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
      <Card className="border border-gray-200 shadow-md">
        <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">Video Topics Analysis</CardTitle>
            <p className="text-sm text-gray-500 mt-1">{videoUrl}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {onExtractContent && (
              <Button 
                onClick={openExtractDialog}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium"
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
                  Extract Content
                </span>
              </Button>
            )}
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
          <div className="divide-y divide-gray-100">
            {sections.map((section, index) => (
              <div key={index} className="py-4">
                <div 
                  className="flex items-start cursor-pointer"
                  onClick={() => toggleSection(index)}
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-gray-500 text-sm font-medium mr-2">
                        {section.startTimeFormatted} - {section.endTimeFormatted}
                      </span>
                      <h3 className="text-lg font-semibold">{section.title}</h3>
                    </div>
                    
                    <p className="mt-1 text-gray-700">{section.summary}</p>
                    
                    <div className="mt-2">
                      {renderVideoLink(section.startTime)}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="p-1 h-auto"
                    >
                      <svg 
                        className={`w-5 h-5 transform transition-transform ${expandedSection === index ? 'rotate-180' : ''}`} 
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
                
                {expandedSection === index && (
                  <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-line">{section.transcript}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
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