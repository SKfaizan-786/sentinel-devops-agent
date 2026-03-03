const EventEmitter = require('events');

class ReasoningEmitter extends EventEmitter {
  constructor() {
    super();
    this.history = new Map(); // incidentId -> step[]
    this.maxHistorySize = 1000; // Keep last 1000 incidents in memory
  }

  /**
   * Emit a reasoning step for an incident
   * @param {string} incidentId - The incident ID
   * @param {Object} step - The reasoning step
   * @param {string} step.type - Type of reasoning step (evidence_collected, hypothesis_formed, hypothesis_tested, conclusion_reached, action_triggered)
   * @param {string} step.description - Human-readable description
   * @param {number} step.confidence - Confidence level (0-1)
   * @param {Object} step.evidence - Evidence data (optional)
   */
  emit_step(incidentId, step) {
    if (!this.history.has(incidentId)) {
      this.history.set(incidentId, []);
    }

    const fullStep = {
      ...step,
      step: this.history.get(incidentId).length + 1,
      ts: Date.now(),
      incidentId
    };

    this.history.get(incidentId).push(fullStep);

    // Emit to specific incident listeners
    this.emit(`incident:${incidentId}`, fullStep);
    
    // Emit to all listeners
    this.emit('all', fullStep);

    // Clean up old histories if too large
    if (this.history.size > this.maxHistorySize) {
      const oldestKey = this.history.keys().next().value;
      this.history.delete(oldestKey);
    }
  }

  /**
   * Get the complete reasoning history for an incident
   * @param {string} incidentId - The incident ID
   * @returns {Array} Array of reasoning steps
   */
  getHistory(incidentId) {
    return this.history.get(incidentId) || [];
  }

  /**
   * Clear history for a specific incident
   * @param {string} incidentId - The incident ID
   */
  clearHistory(incidentId) {
    this.history.delete(incidentId);
  }

  /**
   * Clear all history
   */
  clearAllHistory() {
    this.history.clear();
  }

  /**
   * Get statistics about the emitter
   * @returns {Object} Stats object
   */
  getStats() {
    return {
      incidentsTracked: this.history.size,
      totalSteps: Array.from(this.history.values()).reduce((sum, steps) => sum + steps.length, 0)
    };
  }
}

module.exports = new ReasoningEmitter();
