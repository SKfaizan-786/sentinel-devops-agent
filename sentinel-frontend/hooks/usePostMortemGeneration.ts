import { useState } from 'react';

// API base URL - configurable for different environments
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface PostMortemMetadata {
  incidentId: number;
  generatedAt: string;
  sections: string[];
  wordCount: number;
  estimatedReadTime: number;
}

interface PostMortemResponse {
  success: boolean;
  postmortem: {
    markdown: string;
    filePath: string;
    metadata: PostMortemMetadata;
  };
  publishing: {
    file: { success: boolean; path: string };
    slack?: { success: boolean; error?: string };
    email?: { success: boolean; error?: string; recipients?: string[] };
    confluence?: { success: boolean; pageUrl?: string; error?: string };
    github?: { success: boolean; commitUrl?: string; error?: string };
  };
}

export function usePostMortemGeneration() {
  const [generatingIncidentIds, setGeneratingIncidentIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedMap, setLastGeneratedMap] = useState<Map<number, PostMortemResponse>>(new Map());

  const generatePostMortem = async (incidentId: number) => {
    setGeneratingIncidentIds(prev => new Set(prev).add(incidentId));
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/postmortem/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId })
      });

      if (!response.ok) {
        // Safely parse error response
        let errorMessage = `Failed to generate post-mortem (HTTP ${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // If JSON parse fails, try to get text or use status text
          try {
            const errorText = await response.text();
            errorMessage = errorText || response.statusText || errorMessage;
          } catch {
            errorMessage = response.statusText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }

      const data: PostMortemResponse = await response.json();
      setLastGeneratedMap(prev => new Map(prev).set(incidentId, data));
      return data;
    } catch (err: unknown) {
      // Safely extract error message
      let errorMessage = 'An unexpected error occurred';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String((err as { message: unknown }).message);
      }
      setError(errorMessage);
      throw err;
    } finally {
      setGeneratingIncidentIds(prev => {
        const next = new Set(prev);
        next.delete(incidentId);
        return next;
      });
    }
  };

  const downloadPostMortem = async (filename: string) => {
    try {
      // Fetch the file content from backend
      const response = await fetch(`${API_BASE_URL}/api/postmortem/${filename}`);
      if (!response.ok) throw new Error('Failed to fetch post-mortem');
      
      const data = await response.json();
      
      // Create a blob from the markdown content
      const blob = new Blob([data.content], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return {
    generatePostMortem,
    downloadPostMortem,
    isGenerating: (incidentId: number) => generatingIncidentIds.has(incidentId),
    error,
    lastGenerated: (incidentId: number) => lastGeneratedMap.get(incidentId) || null
  };
}
