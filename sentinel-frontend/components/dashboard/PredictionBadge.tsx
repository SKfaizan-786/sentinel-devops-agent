import React from 'react';

export interface Prediction {
  containerId: string;
  containerName?: string;
  probability: number;
  estimatedFailureInSeconds: number | null;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  timestamp: number;
  history?: Array<{ timestamp: string; value: number }>;
  slope?: number;
}

export function PredictionBadge({ prediction }: { prediction?: Prediction }) {
  if (!prediction || prediction.probability < 0.3) return null;
  
  const pct = Math.round(prediction.probability * 100);
  const mins = prediction.estimatedFailureInSeconds !== null
    ? `~${Math.ceil(prediction.estimatedFailureInSeconds / 60)}m`
    : 'soon';
    
  return (
    <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded font-medium animate-pulse inline-flex items-center gap-1">
      ⚡ {pct}% failure risk in {mins}
    </span>
  );
}
