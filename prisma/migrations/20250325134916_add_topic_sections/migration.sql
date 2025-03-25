-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TranscriptAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "videoTitle" TEXT,
    "fullTranscript" TEXT NOT NULL,
    "contentClips" TEXT,
    "topicSections" TEXT,
    "analysisType" TEXT NOT NULL DEFAULT 'content',
    "userId" TEXT,
    CONSTRAINT "TranscriptAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TranscriptAnalysis" ("contentClips", "createdAt", "fullTranscript", "id", "updatedAt", "userId", "videoTitle", "videoUrl") SELECT "contentClips", "createdAt", "fullTranscript", "id", "updatedAt", "userId", "videoTitle", "videoUrl" FROM "TranscriptAnalysis";
DROP TABLE "TranscriptAnalysis";
ALTER TABLE "new_TranscriptAnalysis" RENAME TO "TranscriptAnalysis";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
