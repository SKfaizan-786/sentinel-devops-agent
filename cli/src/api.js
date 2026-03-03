import axios from 'axios';
import errorsModule from '../../backend/lib/errors.js';

const { ERRORS, SentinelError } = errorsModule;

const BACKEND_URL = 'http://localhost:4000/api';

const handleApiError = (error, fallbackErrorFactory) => {
    const beErr = error.response?.data?.error;
    if (beErr && beErr.message) {
        throw new SentinelError(
            beErr.code || 'ACTION_FAILED',
            beErr.message,
            beErr.reason || 'An error was returned by the backend.',
            beErr.solution || 'Resolve the backend issue and try again.'
        );
    }
    throw fallbackErrorFactory(error);
};

export const getStatus = async () => {
    try {
        const { data } = await axios.get(`${BACKEND_URL}/status`);
        return data;
    } catch (error) {
        handleApiError(error, () => ERRORS.BACKEND_UNAVAILABLE());
    }
};

export const getInsights = async () => {
    try {
        const { data } = await axios.get(`${BACKEND_URL}/insights`);
        return data.insights || [];
    } catch (error) {
        handleApiError(error, () => ERRORS.BACKEND_UNAVAILABLE());
    }
};

export const triggerAction = async (service, action) => {
    try {
        // action should be 'restart', 'heal', 'down', 'slow'
        // Map 'down'/'slow' to simulate endpoints if needed, or use the backend action endpoint
        const { data } = await axios.post(`${BACKEND_URL}/action/${service}/${action}`);
        return data;
    } catch (error) {
        handleApiError(error, () => ERRORS.ACTION_FAILED(error.message));
    }
};
