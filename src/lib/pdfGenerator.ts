import jsPDF from 'jspdf';

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

export function generateFullTranscriptPDF(transcript: TranscriptItem[], videoTitle: string = "YouTube Transcript") {
  const doc = new jsPDF();
  let y = 20;
  const pageWidth = doc.internal.pageSize.width;
  
  // Title
  doc.setFontSize(18);
  doc.text(videoTitle, pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Subtitle
  doc.setFontSize(14);
  doc.text("Full Transcript", pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Transcript content
  doc.setFontSize(10);
  
  transcript.forEach((item) => {
    const timeInSeconds = Math.floor(item.offset / 1000);
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    const durationInSeconds = Math.round(item.duration / 1000);
    const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const timeWithDuration = `[${timeFormatted}] (${durationInSeconds}s)`;
    
    // Check if we need a new page
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    
    // Add timestamp and text
    doc.setFont("helvetica", 'bold');
    doc.text(timeWithDuration, 10, y);
    doc.setFont("helvetica", 'normal');
    
    // Handle line wrapping for the transcript text
    const textLines = doc.splitTextToSize(item.text, pageWidth - 50);
    doc.text(textLines, 35, y);
    
    y += 5 + (textLines.length * 5);
  });
  
  return doc;
}

export function generateContentClipsPDF(contentClips: ContentClip[], videoTitle: string = "Content Clips") {
  const doc = new jsPDF();
  let y = 20;
  const pageWidth = doc.internal.pageSize.width;
  
  // Title
  doc.setFontSize(18);
  doc.text(videoTitle, pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Subtitle
  doc.setFontSize(14);
  doc.text("Short-Form Content Clips", pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Content clips
  contentClips.forEach((clip, index) => {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    // Clip number
    doc.setFontSize(14);
    doc.setFont("helvetica", 'bold');
    doc.text(`Clip ${index + 1}: ${clip.title}`, 10, y);
    y += 10;
    
    // Timestamps
    doc.setFontSize(10);
    doc.setFont("helvetica", 'normal');
    doc.text(`Timestamps: ${clip.startTimeFormatted} - ${clip.endTimeFormatted} (${Math.round((clip.endTime - clip.startTime) / 1000)}s)`, 10, y);
    y += 7;
    
    // Summary
    doc.setFontSize(10);
    doc.setFont("helvetica", 'bold');
    doc.text("Summary:", 10, y);
    y += 5;
    
    doc.setFont("helvetica", 'normal');
    const summaryLines = doc.splitTextToSize(clip.summary, pageWidth - 20);
    doc.text(summaryLines, 10, y);
    y += (summaryLines.length * 5) + 5;
    
    // Reason
    doc.setFontSize(10);
    doc.setFont("helvetica", 'bold');
    doc.text("Why This Works:", 10, y);
    y += 5;
    
    doc.setFont("helvetica", 'normal');
    const reasonLines = doc.splitTextToSize(clip.reason, pageWidth - 20);
    doc.text(reasonLines, 10, y);
    y += (reasonLines.length * 5) + 5;
    
    // Transcript
    doc.setFontSize(10);
    doc.setFont("helvetica", 'bold');
    doc.text("Transcript:", 10, y);
    y += 5;
    
    doc.setFont("helvetica", 'normal');
    const transcriptLines = doc.splitTextToSize(clip.transcript, pageWidth - 20);
    doc.text(transcriptLines, 10, y);
    y += (transcriptLines.length * 5) + 15;
  });
  
  return doc;
} 