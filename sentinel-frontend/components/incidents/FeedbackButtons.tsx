"use client";

import { MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/common/Button";
import { useState } from "react";
import { useFeedback } from "@/hooks/useFeedback";

interface FeedbackButtonsProps {
    incidentId: string;
    onFeedback?: (isPositive: boolean) => void;
}

export function FeedbackButtons({ incidentId, onFeedback }: FeedbackButtonsProps) {
    const { submitFeedback, feedbackState } = useFeedback();
    const [localFeedback, setLocalFeedback] = useState<number | null>(null);

    const handleFeedback = async (isPositive: boolean) => {
        const ok = await submitFeedback(incidentId, isPositive);
        if (!ok) return;
        setLocalFeedback(isPositive ? 1 : -1);
        if (onFeedback) onFeedback(isPositive);
    };

    const hasFeedback = feedbackState[incidentId] !== undefined || localFeedback !== null;
    const isUp = feedbackState[incidentId] === true || localFeedback === 1;
    const isDown = feedbackState[incidentId] === false || localFeedback === -1;

    return (
        <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-muted-foreground mr-2">Was this helpful?</span>
            <Button 
                aria-label="Helpful"
                variant="ghost" 
                size="icon" 
                className={`h-6 w-6 ${isUp ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground hover:text-green-500'}`}
                onClick={() => handleFeedback(true)}
                disabled={hasFeedback}
            >
                <ThumbsUp className="h-3 w-3" />
            </Button>
            <Button 
                aria-label="Not helpful"
                variant="ghost" 
                size="icon" 
                className={`h-6 w-6 ${isDown ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:text-red-500'}`}
                onClick={() => handleFeedback(false)}
                disabled={hasFeedback}
            >
                <ThumbsDown className="h-3 w-3" />
            </Button>
        </div>
    );
}
