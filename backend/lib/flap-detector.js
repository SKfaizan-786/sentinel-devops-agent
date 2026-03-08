class FlapDetector {
    constructor(maxFlips = 3, windowMs = 5 * 60 * 1000) {
        this.history = new Map(); // containerId -> { flips: [], suppressed: bool }
        this.maxFlips = maxFlips;
        this.windowMs = windowMs;
    }

    record(containerId, isHealthy) {
        if (!this.history.has(containerId)) {
            this.history.set(containerId, { flips: [], suppressed: false });
        }
        const state = this.history.get(containerId);
        const now = Date.now();
        state.flips = state.flips.filter(t => now - t < this.windowMs);

        // Auto-clear suppression if flips have aged out of the window
        if (state.suppressed && state.flips.length < this.maxFlips) {
            state.suppressed = false;
        }

        if (state.flips.length >= this.maxFlips) {
            state.suppressed = true;
            return { flapping: true, suppressAlert: true };
        }
        if (state.suppressed && isHealthy) {
            state.suppressed = false;
            state.flips = [];
        }
        return { flapping: false, suppressAlert: state.suppressed };
    }

    /**
     * Clear flap history for a container.
     * Must be called when a container stops being monitored to prevent
     * stale flip timestamps from carrying over on restart.
     */
    clear(containerId) {
        this.history.delete(containerId);
    }
}

module.exports = new FlapDetector();
