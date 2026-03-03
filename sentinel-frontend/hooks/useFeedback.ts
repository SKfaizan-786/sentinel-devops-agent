import { useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useFeedback() {
    const [feedbackState, setFeedbackState] = useState<Record<string, boolean | undefined>>({});

    const submitFeedback = async (incidentId: string, isPositive: boolean): Promise<boolean> => {
        try {
            await axios.post(`${API_BASE}/api/feedback/${incidentId}`, { isPositive });
            setFeedbackState(prev => ({
                ...prev,
                [incidentId]: isPositive
            }));
            return true;
        } catch (error) {
            console.error("Failed to submit feedback:", error);
            return false;
        }
    };

    return {
        submitFeedback,
        feedbackState
    };
}
