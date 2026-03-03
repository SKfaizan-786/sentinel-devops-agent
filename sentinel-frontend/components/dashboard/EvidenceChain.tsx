'use client';

import React from 'react';
import {
  AlertCircle,
  CheckCircle,
  Lightbulb,
  BarChart3,
  FileText,
  RotateCcw,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { ReasoningStep } from '@/hooks/useReasoningStream';
import { ConfidenceMeter } from './ConfidenceMeter';

interface EvidenceChainProps {
  steps: ReasoningStep[];
  isLoading?: boolean;
  maxStepsToShow?: number;
  expandedStepId?: number;
  onExpandStep?: (stepId: number) => void;
}

const getStepIcon = (type: string) => {
  switch (type) {
    case 'investigation_started':
      return <BarChart3 className="h-4 w-4 text-blue-400" />;
    case 'evidence_collected':
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    case 'hypothesis_formed':
      return <Lightbulb className="h-4 w-4 text-yellow-400" />;
    case 'hypothesis_tested':
      return <CheckCircle className="h-4 w-4 text-orange-400" />;
    case 'action_triggered':
      return <Zap className="h-4 w-4 text-purple-400" />;
    case 'action_completed':
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    case 'conclusion_reached':
      return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    default:
      return <FileText className="h-4 w-4 text-gray-400" />;
  }
};

const getStepLabel = (type: string) => {
  switch (type) {
    case 'investigation_started':
      return 'Investigation Started';
    case 'evidence_collected':
      return 'Evidence Collected';
    case 'hypothesis_formed':
      return 'Hypothesis Formed';
    case 'hypothesis_tested':
      return 'Hypothesis Tested';
    case 'action_triggered':
      return 'Action Triggered';
    case 'action_completed':
      return 'Action Completed';
    case 'conclusion_reached':
      return 'Conclusion Reached';
    default:
      return 'Step';
  }
};

const formatTimestamp = (ts: number) => {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const EvidenceItem: React.FC<{ evidence?: Record<string, any> }> = ({ evidence }) => {
  if (!evidence) return null;

  return (
    <div className="mt-2 p-2 bg-black/30 rounded border border-white/5 space-y-1">
      {Object.entries(evidence).map(([key, value]) => (
        <div key={key} className="text-xs flex justify-between">
          <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
          <span className="text-white font-mono">
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export function EvidenceChain({
  steps,
  isLoading = false,
  maxStepsToShow = 10,
  expandedStepId,
  onExpandStep,
}: EvidenceChainProps) {
  // Show most recent steps first, limit to maxStepsToShow
  const displaySteps = steps.slice(-maxStepsToShow).reverse();
  const hasMoreSteps = steps.length > maxStepsToShow;

  if (steps.length === 0 && !isLoading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">No reasoning steps yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline */}
      {displaySteps.length > 0 && (
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-linear-to-b from-white/20 to-white/5" />

          {/* Steps */}
          <div className="space-y-4">
            {displaySteps.map((step, idx) => (
              <div key={step.step} className="relative pl-12">
                {/* Dot */}
                <div className="absolute left-0 top-1.5 w-9 h-9 bg-slate-900/50 border-2 border-primary/30 rounded-full flex items-center justify-center">
                  {getStepIcon(step.type)}
                </div>

                {/* Card */}
                <button
                  type="button"
                  className="w-full text-left bg-slate-900/30 border border-white/10 rounded-lg p-3 hover:border-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  onClick={() => onExpandStep?.(step.step)}
                  aria-expanded={expandedStepId === step.step}
                  aria-label={`${getStepLabel(step.type)} step detail`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xs font-semibold text-white">
                          {getStepLabel(step.type)}
                        </h4>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10">
                          Step {step.step}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{step.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-muted-foreground">
                        {formatTimestamp(step.ts)}
                      </span>
                    </div>
                  </div>

                  {/* Confidence Meter for this step */}
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <ConfidenceMeter
                      confidence={step.confidence}
                      size="sm"
                      showLabel={false}
                      animated={idx === 0}
                    />
                  </div>

                  {/* Expanded Evidence */}
                  {expandedStepId === step.step && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <EvidenceItem evidence={step.evidence} />
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="relative pl-12">
          <div className="absolute left-0 top-1.5 w-9 h-9 bg-slate-900/50 border-2 border-primary/30 rounded-full flex items-center justify-center animate-pulse">
            <Zap className="h-4 w-4 text-primary/50" />
          </div>
          <div className="bg-slate-900/30 border border-white/10 rounded-lg p-3 animate-pulse">
            <div className="h-3 bg-white/10 rounded w-1/3 mb-2" />
            <div className="h-2 bg-white/5 rounded w-2/3" />
          </div>
        </div>
      )}

      {/* More Steps Indicator */}
      {hasMoreSteps && (
        <div className="text-center text-xs text-muted-foreground pt-2">
          + {steps.length - maxStepsToShow} more steps (scroll to see full history)
        </div>
      )}
    </div>
  );
}
