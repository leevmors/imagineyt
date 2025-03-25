"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

export function TopicSectionsSkeleton() {
  const [progress, setProgress] = useState(0);
  const [analyzeStage, setAnalyzeStage] = useState(0);
  
  const analyzeStages = [
    "Reading transcript...",
    "Analyzing content...",
    "Identifying topics...",
    "Generating summaries...",
    "Finalizing analysis..."
  ];
  
  useEffect(() => {
    // Simulate progress
    const timer = setInterval(() => {
      setProgress(prevProgress => {
        if (prevProgress >= 100) {
          clearInterval(timer);
          return 100;
        }
        
        const newProgress = prevProgress + 1;
        
        // Update analyze stage based on progress
        if (newProgress > 95) {
          setAnalyzeStage(4);
        } else if (newProgress > 75) {
          setAnalyzeStage(3);
        } else if (newProgress > 50) {
          setAnalyzeStage(2);
        } else if (newProgress > 20) {
          setAnalyzeStage(1);
        }
        
        return newProgress;
      });
    }, 120);
    
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in-50 duration-500">
      <Card className="border border-gray-200 shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Analyzing Video Topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-24 h-24 relative mb-6">
              <svg 
                className="w-full h-full animate-spin-slow" 
                viewBox="0 0 100 100" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle 
                  cx="50" 
                  cy="50" 
                  r="45" 
                  fill="none" 
                  stroke="#f0f0f0" 
                  strokeWidth="8" 
                />
                <path
                  d="M50 5 A 45 45 0 0 1 95 50"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#9333ea" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-indigo-600">{progress}%</span>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold mb-2 text-center">
              {analyzeStages[analyzeStage]}
            </h3>
            <p className="text-gray-500 max-w-md text-center">
              DeepSeek AI is analyzing the transcript to identify key topics and create detailed summaries. This may take a moment.
            </p>
          </div>
          
          <div className="space-y-3">
            <Progress value={progress} className="h-2" />
            
            <div className="grid grid-cols-5 gap-1 text-xs text-center">
              {analyzeStages.map((stage, index) => (
                <div 
                  key={index}
                  className={`px-1 ${index <= analyzeStage ? 'text-indigo-600 font-medium' : 'text-gray-400'}`}
                >
                  {index + 1}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8 space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-full"></div>
                <div className="h-4 bg-gray-100 rounded w-full mt-2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 