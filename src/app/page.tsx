"use client";

import { useState } from "react";
import { YoutubeForm } from "@/components/YoutubeForm";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import { ContentClips } from "@/components/ContentClips";
import { TopicSections } from "@/components/TopicSections";
import { ContentClipSkeleton } from "@/components/ContentClipSkeleton";
import { SavedAnalyses } from "@/components/SavedAnalyses";
import { AnalysisModal } from "@/components/AnalysisModal";
import { TopicSectionsSkeleton } from "@/components/TopicSectionsSkeleton";

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

export default function Home() {
  const [transcript, setTranscript] = useState<TranscriptItem[] | null>(null);
  const [contentClips, setContentClips] = useState<ContentClip[] | null>(null);
  const [topicSections, setTopicSections] = useState<TopicSection[] | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [analyzingTopics, setAnalyzingTopics] = useState(false);

  const handleTranscriptFetched = (newTranscript: TranscriptItem[], url: string) => {
    setTranscript(newTranscript);
    setVideoUrl(url);
    // Extract video title from URL (basic implementation)
    try {
      const urlObj = new URL(url);
      const videoId = urlObj.searchParams.get('v');
      setVideoTitle(`YouTube Video ${videoId || ''}`);
    } catch {
      setVideoTitle("YouTube Video");
    }
  };

  const handleContentClipsFetched = (newContentClips: ContentClip[]) => {
    setContentClips(newContentClips);
    setTopicSections(null);
  };

  const handleTopicSectionsFetched = (newTopicSections: TopicSection[]) => {
    setTopicSections(newTopicSections);
    setContentClips(null);
    setAnalyzingTopics(false);
  };

  const handleReset = () => {
    setTranscript(null);
    setContentClips(null);
    setTopicSections(null);
    setVideoUrl(null);
  };

  const handleAnalysisSelected = (analysisId: string) => {
    setSelectedAnalysisId(analysisId);
  };

  const handleCloseModal = () => {
    setSelectedAnalysisId(null);
  };

  const renderContent = () => {
    // Show loading state when extracting content
    if (extracting) {
      return <ContentClipSkeleton />;
    }

    // Show loading state when analyzing topics
    if (analyzingTopics) {
      return <TopicSectionsSkeleton />;
    }

    if (contentClips) {
      return (
        <ContentClips 
          clips={contentClips} 
          transcript={transcript || undefined}
          videoUrl={videoUrl || undefined}
          videoTitle={videoTitle || undefined}
          onReset={handleReset} 
        />
      );
    }

    if (topicSections) {
      return (
        <TopicSections 
          sections={topicSections}
          transcript={transcript || undefined}
          videoUrl={videoUrl || undefined}
          videoTitle={videoTitle || undefined}
          onReset={handleReset}
          onExtractContent={async () => {
            try {
              // Show loading state
              setTopicSections(null);
              setExtracting(true);
              
              // Make API call directly from here
              const response = await fetch("/api/extract-content", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                  transcript,
                  numClips: 5 // Default value
                }),
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to extract content");
              }
              
              const data = await response.json();
              handleContentClipsFetched(data.contentClips);
            } catch (error: unknown) {
              console.error("Error extracting content:", error);
              // If extraction fails, go back to topics view
              handleTopicSectionsFetched(topicSections);
            } finally {
              setExtracting(false);
            }
          }}
        />
      );
    }
    
    if (transcript) {
      return (
        <TranscriptDisplay 
          transcript={transcript} 
          videoUrl={videoUrl || ""}
          onContentExtracted={handleContentClipsFetched}
          onTopicsFetched={handleTopicSectionsFetched}
          onReset={handleReset}
          onAnalyzingTopicsChange={setAnalyzingTopics}
        />
      );
    }
    
    return <YoutubeForm onTranscriptFetched={handleTranscriptFetched} />;
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto py-8 md:py-16">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            YouTube Transcript Extractor
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Easily extract and view the transcript from any YouTube video with timecodes.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-lg shadow-lg p-6 md:p-8 border border-gray-200 dark:border-gray-800 transition-all duration-300">
          {renderContent()}
        </div>
        
        {!transcript && <SavedAnalyses onAnalysisSelected={handleAnalysisSelected} />}
      </div>
      
      {selectedAnalysisId && (
        <AnalysisModal
          analysisId={selectedAnalysisId}
          onClose={handleCloseModal}
        />
      )}
    </main>
  );
}
