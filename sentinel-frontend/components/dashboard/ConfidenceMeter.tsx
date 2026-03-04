'use client';

import React, { useEffect, useState } from 'react';
import { Cloud, AlertCircle, CheckCircle } from 'lucide-react';

interface ConfidenceMeterProps {
  confidence: number; // 0-1
  maxConfidence?: number; // 0-1, for tracking overall trajectory
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showDetails?: boolean;
}

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-red-400';
  if (confidence >= 0.6) return 'text-orange-400';
  if (confidence >= 0.4) return 'text-yellow-400';
  return 'text-blue-400';
};

const getConfidenceBgColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'bg-red-500';
  if (confidence >= 0.6) return 'bg-orange-500';
  if (confidence >= 0.4) return 'bg-yellow-500';
  return 'bg-blue-500';
};

const getConfidenceLabel = (confidence: number): string => {
  if (confidence >= 0.8) return 'Very High';
  if (confidence >= 0.6) return 'High';
  if (confidence >= 0.4) return 'Moderate';
  if (confidence >= 0.2) return 'Low';
  return 'Minimal';
};

const getConfidenceIcon = (confidence: number) => {
  if (confidence >= 0.8) return <AlertCircle className="h-4 w-4" />;
  if (confidence >= 0.6) return <AlertCircle className="h-4 w-4" />;
  if (confidence >= 0.4) return <Cloud className="h-4 w-4" />;
  return <CheckCircle className="h-4 w-4" />;
};

export function ConfidenceMeter({
  confidence: rawConfidence,
  maxConfidence: rawMaxConfidence = rawConfidence,
  animated = true,
  size = 'md',
  showLabel = true,
  showDetails = false,
}: ConfidenceMeterProps) {
  // Clamp values to [0, 1] for safety
  const confidence = Math.min(Math.max(rawConfidence, 0), 1);
  const maxConfidence = Math.min(Math.max(rawMaxConfidence, 0), 1);
  const [displayConfidence, setDisplayConfidence] = useState(confidence);

  useEffect(() => {
    if (!animated) {
      setDisplayConfidence(confidence);
      return;
    }

    const interval = setInterval(() => {
      setDisplayConfidence((prev) => {
        const target = confidence;
        const diff = target - prev;
        if (Math.abs(diff) < 0.001) {
          clearInterval(interval);
          return target;
        }
        return prev + diff * 0.1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [confidence, animated]);

  const pct = Math.round(displayConfidence * 100);
  const clampedPct = Math.min(Math.max(pct, 0), 100);
  const maxPct = Math.round(maxConfidence * 100);
  const colorClass = getConfidenceColor(confidence);
  const bgColorClass = getConfidenceBgColor(confidence);
  const label = getConfidenceLabel(confidence);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className="space-y-2">
      {/* Main Confidence Meter */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className={`w-full ${sizeClasses[size]} bg-white/10 rounded-full overflow-hidden border border-white/5`}>
            <div
              className={`${sizeClasses[size]} rounded-full transition-all duration-300 ${bgColorClass} shadow-lg`}
              style={{
                width: `${clampedPct}%`,
                boxShadow: `0 0 12px ${
                  confidence >= 0.8
                    ? 'rgba(239, 68, 68, 0.5)'
                    : confidence >= 0.6
                      ? 'rgba(249, 115, 22, 0.5)'
                      : confidence >= 0.4
                        ? 'rgba(234, 179, 8, 0.5)'
                        : 'rgba(59, 130, 246, 0.5)'
                }`,
              }}
            />
          </div>
        </div>

        {/* Percentage and Icon */}
        <div className="flex items-center gap-2 min-w-max">
          <span className={`font-mono font-semibold ${colorClass} ${textSizes[size]}`}>{pct}%</span>
          <div className={colorClass}>{getConfidenceIcon(confidence)}</div>
        </div>
      </div>

      {/* Label and Details */}
      {showLabel && (
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className={`font-medium ${colorClass}`}>{label} Confidence</span>
          {showDetails && (
            <div className="flex gap-3 text-muted-foreground">
              <span>Current: {pct}%</span>
              {maxConfidence > confidence && <span>Peak: {maxPct}%</span>}
            </div>
          )}
        </div>
      )}

      {/* Trajectory Indicator */}
      {showDetails && maxConfidence > confidence && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400/50"></span>
          Peak confidence: {maxPct}% (Reconsidering evidence)
        </div>
      )}
    </div>
  );
}
