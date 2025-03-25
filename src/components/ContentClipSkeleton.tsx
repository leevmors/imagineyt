"use client";

export function ContentClipSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-4">Extracting Content Clips</h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          DeepSeek AI is analyzing the transcript and identifying the most engaging, shareable moments for short-form content.
        </p>
      </div>
      
      <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full mb-8 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 animate-progress" 
             style={{ width: '90%', animation: 'progressAnimation 2s ease-in-out infinite alternate' }}></div>
      </div>
      
      {[1, 2, 3, 4, 5].map((index) => (
        <div 
          key={index} 
          className="p-5 rounded-lg border border-gray-200 bg-white dark:bg-gray-950"
        >
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3"></div>
          <div className="flex justify-between mb-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-20"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-20"></div>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-4"></div>
          
          <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mt-4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
        </div>
      ))}
      
      <style jsx>{`
        @keyframes progressAnimation {
          0% {
            width: 15%;
          }
          100% {
            width: 95%;
          }
        }
      `}</style>
    </div>
  );
} 