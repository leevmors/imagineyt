"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SavedAnalysis = {
  id: string;
  videoUrl: string;
  videoTitle: string;
  createdAt: string;
  updatedAt: string;
  analysisType?: string;
};

interface SavedAnalysesProps {
  onAnalysisSelected: (analysisId: string) => void;
}

export function SavedAnalyses({ onAnalysisSelected }: SavedAnalysesProps) {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch("/api/get-analyses");
        
        if (!response.ok) {
          throw new Error("Failed to fetch saved analyses");
        }
        
        const data = await response.json();
        setAnalyses(data.analyses);
      } catch (err: unknown) {
        console.error("Error fetching analyses:", err);
        const errorMessage = err instanceof Error ? err.message : "Something went wrong";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyses();
  }, []);

  // Format date to a readable string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Get badge color and label based on analysis type
  const getAnalysisBadge = (analysisType?: string) => {
    switch (analysisType) {
      case 'content':
        return { color: 'bg-indigo-100 text-indigo-800', label: 'Content Clips' };
      case 'topics':
        return { color: 'bg-purple-100 text-purple-800', label: 'Topic Sections' };
      case 'transcript':
        return { color: 'bg-blue-100 text-blue-800', label: 'Full Transcript' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: 'Analysis' };
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Your Saved Analyses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((index) => (
            <div 
              key={index} 
              className="h-40 bg-gray-200 dark:bg-gray-800 rounded-lg"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Your Saved Analyses</h2>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Your Saved Analyses</h2>
        <div className="text-center text-gray-500 py-10 border border-dashed rounded-lg">
          No saved analyses yet. Analyze a YouTube video and save the results to see them here.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Your Saved Analyses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {analyses.map((analysis) => {
          const badge = getAnalysisBadge(analysis.analysisType);
          
          return (
            <Card 
              key={analysis.id}
              className="cursor-pointer hover:shadow-md transition-shadow border border-gray-200"
              onClick={() => onAnalysisSelected(analysis.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg line-clamp-1">{analysis.videoTitle}</CardTitle>
                  <Badge className={`ml-2 ${badge.color}`}>
                    {badge.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-2 line-clamp-1">{analysis.videoUrl}</p>
                <p className="text-xs text-gray-400">Created: {formatDate(analysis.createdAt)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 