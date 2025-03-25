"use client";

import { useEffect, useState } from "react";
import { ContentClips } from "./ContentClips";
import { ContentClipSkeleton } from "./ContentClipSkeleton";
import { TopicSections } from "./TopicSections";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type AnalysisData = {
  id: string;
  videoUrl: string;
  videoTitle: string;
  fullTranscript: TranscriptItem[];
  contentClips?: ContentClip[];
  topicSections?: TopicSection[];
  analysisType: string;
  createdAt: string;
  updatedAt: string;
};

interface AnalysisModalProps {
  analysisId: string;
  onClose: () => void;
}

export function AnalysisModal({ analysisId, onClose }: AnalysisModalProps) {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("default");
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatingTopics, setGeneratingTopics] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch("/api/get-analyses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: analysisId }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch analysis");
        }
        
        const data = await response.json();
        setAnalysis(data.analysis);
        
        // Set the default active tab based on analysisType
        if (data.analysis.analysisType) {
          setActiveTab(data.analysis.analysisType);
        } else if (data.analysis.contentClips) {
          setActiveTab("content");
        } else if (data.analysis.topicSections) {
          setActiveTab("topics");
        } else {
          setActiveTab("transcript");
        }
      } catch (err: unknown) {
        console.error("Error fetching analysis:", err);
        const errorMessage = err instanceof Error ? err.message : "Something went wrong";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (analysisId) {
      fetchAnalysis();
    }
  }, [analysisId]);

  // Function to handle going back to home page
  const handleGoHome = () => {
    onClose();
    // Optional: Add any additional logic to navigate to home
  };

  // Function to generate content clips analysis
  const handleGenerateContent = async () => {
    if (!analysis?.fullTranscript) return;

    try {
      setGeneratingContent(true);
      setGenerationError(null);
      
      const response = await fetch("/api/extract-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          transcript: analysis.fullTranscript,
          numClips: 5 // Default value
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract content");
      }
      
      const data = await response.json();
      
      // Save the newly generated content
      const saveResponse = await fetch("/api/save-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl: analysis.videoUrl,
          videoTitle: analysis.videoTitle,
          fullTranscript: analysis.fullTranscript,
          contentClips: data.contentClips,
          analysisType: "content"
        }),
      });
      
      if (!saveResponse.ok) {
        throw new Error("Failed to save generated content");
      }
      
      // Update the current analysis with the new data
      setAnalysis({
        ...analysis,
        contentClips: data.contentClips
      });
      
      // Switch to the content tab
      setActiveTab("content");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate content clips";
      setGenerationError(errorMessage);
      console.error("Error generating content:", err);
    } finally {
      setGeneratingContent(false);
    }
  };

  // Function to generate topic sections analysis
  const handleGenerateTopics = async () => {
    if (!analysis?.fullTranscript) return;

    try {
      setGeneratingTopics(true);
      setGenerationError(null);
      
      const response = await fetch("/api/get-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          transcript: analysis.fullTranscript
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze topics");
      }
      
      const data = await response.json();
      
      // Save the newly generated topics
      const saveResponse = await fetch("/api/save-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl: analysis.videoUrl,
          videoTitle: analysis.videoTitle,
          fullTranscript: analysis.fullTranscript,
          topicSections: data.topicSections,
          analysisType: "topics"
        }),
      });
      
      if (!saveResponse.ok) {
        throw new Error("Failed to save generated topics");
      }
      
      // Update the current analysis with the new data
      setAnalysis({
        ...analysis,
        topicSections: data.topicSections
      });
      
      // Switch to the topics tab
      setActiveTab("topics");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate topics";
      setGenerationError(errorMessage);
      console.error("Error generating topics:", err);
    } finally {
      setGeneratingTopics(false);
    }
  };
  
  // Get available tabs based on what data is present
  const getAvailableTabs = () => {
    if (!analysis) return [];
    
    const tabs = [];
    
    // Always have the full transcript
    tabs.push({ id: "transcript", label: "Full Transcript" });
    
    // Add other tabs if data is available
    if (analysis.contentClips) {
      tabs.push({ id: "content", label: "Content Clips" });
    }
    
    if (analysis.topicSections) {
      tabs.push({ id: "topics", label: "Topic Sections" });
    }
    
    return tabs;
  };

  // Check if certain analysis types are missing
  const isMissingContentAnalysis = analysis && !analysis.contentClips;
  const isMissingTopicsAnalysis = analysis && !analysis.topicSections;
  
  // Render missing analysis generation buttons
  const renderGenerationButtons = () => {
    if (!analysis) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {isMissingContentAnalysis && (
          <Button 
            onClick={handleGenerateContent}
            disabled={generatingContent}
            variant="outline"
            size="sm"
            className="bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200"
          >
            {generatingContent ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Content Clips...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21.928 11.607c-.202-.488-.635-.605-.928-.633V8c0-1.103-.897-2-2-2h-6V4.61c.305-.274.5-.668.5-1.11a1.5 1.5 0 0 0-3 0c0 .442.195.836.5 1.11V6H5c-1.103 0-2 .897-2 2v2.997l-.082.006A1 1 0 0 0 1.99 12v2a1 1 0 0 0 1 1H3v5c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2v-5a1 1 0 0 0 1-1v-1.938a1.006 1.006 0 0 0-.072-.455zM5 20V8h14l.001 3.996L19 12v2l.001.005.001 5.995H5z"/>
                  <ellipse cx="8.5" cy="12" rx="1.5" ry="2"/>
                  <ellipse cx="15.5" cy="12" rx="1.5" ry="2"/>
                  <path d="M8 16h8v2H8z"/>
                </svg>
                Generate Content Clips
              </span>
            )}
          </Button>
        )}
        
        {isMissingTopicsAnalysis && (
          <Button 
            onClick={handleGenerateTopics}
            disabled={generatingTopics}
            variant="outline"
            size="sm"
            className="bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200"
          >
            {generatingTopics ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Topics...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Generate Topics
              </span>
            )}
          </Button>
        )}
      </div>
    );
  };
  
  const renderContent = () => {
    if (!analysis) return null;
    
    switch (activeTab) {
      case "content":
        if (analysis.contentClips) {
          return (
            <ContentClips 
              clips={analysis.contentClips} 
              transcript={analysis.fullTranscript}
              videoUrl={analysis.videoUrl}
              videoTitle={analysis.videoTitle || "YouTube Video"}
              onReset={onClose}
            />
          );
        }
        break;
        
      case "topics":
        if (analysis.topicSections) {
          return (
            <TopicSections 
              sections={analysis.topicSections}
              transcript={analysis.fullTranscript}
              videoUrl={analysis.videoUrl}
              videoTitle={analysis.videoTitle || "YouTube Video"}
              onReset={onClose}
            />
          );
        }
        break;
        
      case "transcript":
      default:
        return (
          <div className="space-y-4">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-2">
              {analysis.fullTranscript.map((item, index) => (
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
          </div>
        );
    }
    
    // Fallback to transcript if the active tab has no data
    return renderContent();
  };
  
  // Format time from milliseconds to MM:SS
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-950 rounded-lg shadow-xl max-h-[90vh] w-full max-w-4xl overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold">
              {analysis?.videoTitle || "Saved Analysis"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleGoHome}
              variant="ghost" 
              size="sm"
              className="text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="sr-only">Home</span>
            </Button>
            <Button 
              onClick={onClose}
              variant="ghost" 
              size="sm"
              className="text-gray-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-6">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>
        
        {analysis && (
          <div className="px-4 pt-3 pb-0">
            <h1 className="text-2xl font-bold text-center mb-2">{analysis.videoTitle || "YouTube Video"}</h1>
            <p className="text-sm text-gray-500 text-center mb-4">{analysis.videoUrl}</p>
          </div>
        )}
        
        {generationError && (
          <div className="px-4 py-2">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {generationError}
            </div>
          </div>
        )}
        
        {!isLoading && analysis && (
          <div className="px-4 py-2">
            {renderGenerationButtons()}
          </div>
        )}
        
        {!isLoading && analysis && getAvailableTabs().length > 1 && (
          <div className="px-4 py-2 border-b">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid" style={{ gridTemplateColumns: `repeat(${getAvailableTabs().length}, minmax(0, 1fr))` }}>
                {getAvailableTabs().map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}
        
        <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(90vh - 160px)" }}>
          {isLoading ? (
            <div className="py-8">
              <div className="w-full h-2 bg-gray-200 rounded overflow-hidden mb-6">
                <div className="h-full bg-blue-500 animate-pulse" style={{ width: "90%" }}></div>
              </div>
              <ContentClipSkeleton />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : analysis ? (
            renderContent()
          ) : (
            <div className="text-center py-8 text-gray-500">
              Analysis not found
            </div>
          )}
        </div>
        
        <div className="p-4 border-t flex justify-between">
          <Button
            onClick={onClose}
            variant="outline"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Button>
          <Button
            onClick={handleGoHome}
            variant="outline"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Button>
        </div>
      </div>
    </div>
  );
} 