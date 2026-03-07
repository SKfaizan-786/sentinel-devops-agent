/**
 * SLO Tracker Unit Tests
 * 
 * Tests for downtime event recording and incident tracking.
 */

const tracker = require('../../slo/tracker');

describe('SLO Tracker - Unit Tests', () => {
  beforeEach(() => {
    // Clear all tracked data before each test
    tracker.clearAll();
  });

  describe('Recording Downtime Events', () => {
    it('should record a downtime event', () => {
      const event = tracker.recordDowntime('service-123', 30, 'Database maintenance');

      expect(event).toHaveProperty('id');
      expect(event.serviceId).toBe('service-123');
      expect(event.downtimeMinutes).toBe(30);
      expect(event.description).toBe('Database maintenance');
    });

    it('should record event with timestamp', () => {
      const before = Date.now();
      const event = tracker.recordDowntime('service-123', 15);
      const after = Date.now();

      expect(event.resolvedAt).toBeGreaterThanOrEqual(before);
      expect(event.resolvedAt).toBeLessThanOrEqual(after);
    });

    it('should calculate createdAt based on downtime duration', () => {
      const event = tracker.recordDowntime('service-123', 60, 'Outage');

      // createdAt should be 60 minutes before resolvedAt
      const timeDiff = event.resolvedAt - event.createdAt;
      const minutesDiff = timeDiff / (60 * 1000);

      expect(minutesDiff).toBeCloseTo(60, 0);
    });

    it('should generate unique event IDs', () => {
      const event1 = tracker.recordDowntime('service-123', 10);
      const event2 = tracker.recordDowntime('service-123', 10);

      expect(event1.id).not.toBe(event2.id);
    });

    it('should throw error on invalid serviceId', () => {
      expect(() => {
        tracker.recordDowntime(null, 10);
      }).toThrow();
    });

    it('should throw error on invalid downtime minutes', () => {
      expect(() => {
        tracker.recordDowntime('service-123', -10);
      }).toThrow();

      expect(() => {
        tracker.recordDowntime('service-123', 0);
      }).toThrow();

      expect(() => {
        tracker.recordDowntime('service-123', 'not-a-number');
      }).toThrow();
    });

    it('should accept description as optional', () => {
      const event1 = tracker.recordDowntime('service-123', 10);
      const event2 = tracker.recordDowntime('service-123', 10, 'With description');

      expect(event1.description).toBe('');
      expect(event2.description).toBe('With description');
    });

    it('should handle very small downtime values', () => {
      const event = tracker.recordDowntime('service-123', 0.5, 'Brief blip');

      expect(event.downtimeMinutes).toBe(0.5);
      expect(event.id).toBeDefined();
    });

    it('should handle very large downtime values', () => {
      const event = tracker.recordDowntime('service-123', 10000, 'Extended outage');

      expect(event.downtimeMinutes).toBe(10000);
    });
  });

  describe('Retrieving Incidents', () => {
    it('should get all incidents for a service', () => {
      tracker.recordDowntime('service-123', 10);
      tracker.recordDowntime('service-123', 20);
      tracker.recordDowntime('service-456', 15);

      const incidents = tracker.getIncidents('service-123');

      expect(incidents.length).toBe(2);
      expect(incidents.every((i) => i.serviceId === 'service-123')).toBe(true);
    });

    it('should return empty array for service with no incidents', () => {
      const incidents = tracker.getIncidents('nonexistent-service');

      expect(incidents).toEqual([]);
    });

    it('should filter incidents by window start time', () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;

      tracker.recordDowntime('service-123', 10);
      tracker.recordDowntime('service-123', 20);

      const allIncidents = tracker.getIncidents('service-123');
      const recentIncidents = tracker.getIncidents('service-123', now - 10 * 60 * 1000);

      expect(allIncidents.length).toBe(2);
      expect(recentIncidents.length).toBeLessThanOrEqual(2);
    });

    it('should maintain incident data integrity', () => {
      const event = tracker.recordDowntime('service-123', 30, 'Maintenance');
      const incidents = tracker.getIncidents('service-123');

      const retrievedEvent = incidents[0];
      expect(retrievedEvent.id).toBe(event.id);
      expect(retrievedEvent.downtimeMinutes).toBe(event.downtimeMinutes);
      expect(retrievedEvent.description).toBe(event.description);
    });
  });

  describe('Retrieving All Incidents', () => {
    it('should get all incidents across all services', () => {
      tracker.recordDowntime('service-1', 10);
      tracker.recordDowntime('service-2', 20);
      tracker.recordDowntime('service-3', 15);

      const allIncidents = tracker.getAllIncidents();

      expect(allIncidents.length).toBe(3);
    });

    it('should return empty array when no incidents exist', () => {
      const allIncidents = tracker.getAllIncidents();

      expect(allIncidents).toEqual([]);
    });

    it('should sort incidents by timestamp (newest first)', () => {
      const service1 = tracker.recordDowntime('service-1', 10);
      const service2 = tracker.recordDowntime('service-2', 20);
      const service3 = tracker.recordDowntime('service-3', 15);

      const allIncidents = tracker.getAllIncidents();

      // Should be in order: service3, service2, service1 (reverse chronological)
      expect(allIncidents[0].id).toBe(service3.id);
      expect(allIncidents[1].id).toBe(service2.id);
      expect(allIncidents[2].id).toBe(service1.id);
    });

    it('should include incidents from multiple services', () => {
      tracker.recordDowntime('api-gateway', 5);
      tracker.recordDowntime('auth-service', 10);
      tracker.recordDowntime('payment-service', 15);

      const allIncidents = tracker.getAllIncidents();
      const services = new Set(allIncidents.map((i) => i.serviceId));

      expect(services.size).toBe(3);
      expect(services.has('api-gateway')).toBe(true);
      expect(services.has('auth-service')).toBe(true);
      expect(services.has('payment-service')).toBe(true);
    });
  });

  describe('Clearing Tracked Data', () => {
    it('should clear all tracked incidents', () => {
      tracker.recordDowntime('service-1', 10);
      tracker.recordDowntime('service-2', 20);

      tracker.clearAll();

      expect(tracker.getAllIncidents()).toEqual([]);
      expect(tracker.getIncidents('service-1')).toEqual([]);
      expect(tracker.getIncidents('service-2')).toEqual([]);
    });

    it('should allow recording new incidents after clearing', () => {
      tracker.recordDowntime('service-1', 10);
      tracker.clearAll();
      const newEvent = tracker.recordDowntime('service-2', 20);

      expect(newEvent).toBeDefined();
      expect(tracker.getAllIncidents().length).toBe(1);
      expect(tracker.getIncidents('service-2').length).toBe(1);
    });
  });

  describe('Integration Scenarios', () => {
    it('should track multiple incidents for a service over time', () => {
      // Simulate incidents throughout a day
      tracker.recordDowntime('payment-api', 5, 'Brief timeout');
      tracker.recordDowntime('payment-api', 10, 'Database slowdown');
      tracker.recordDowntime('payment-api', 3, 'Connection reset');

      const incidents = tracker.getIncidents('payment-api');

      expect(incidents.length).toBe(3);
      expect(incidents.reduce((sum, i) => sum + i.downtimeMinutes, 0)).toBe(18);
    });

    it('should maintain separate service incident histories', () => {
      // Setup incidents for multiple services
      tracker.recordDowntime('api-gateway', 10);
      tracker.recordDowntime('api-gateway', 5);

      tracker.recordDowntime('auth-service', 15);
      tracker.recordDowntime('auth-service', 8);
      tracker.recordDowntime('auth-service', 2);

      tracker.recordDowntime('database', 20);

      const apiIncidents = tracker.getIncidents('api-gateway');
      const authIncidents = tracker.getIncidents('auth-service');
      const dbIncidents = tracker.getIncidents('database');

      expect(apiIncidents.length).toBe(2);
      expect(authIncidents.length).toBe(3);
      expect(dbIncidents.length).toBe(1);
    });

    it('should support tracking hundreds of incidents', () => {
      // Record 100 incidents
      for (let i = 0; i < 100; i++) {
        tracker.recordDowntime('service-' + (i % 10), Math.random() * 60);
      }

      const allIncidents = tracker.getAllIncidents();
      expect(allIncidents.length).toBe(100);
    });

    it('should calculate total downtime for a service', () => {
      tracker.recordDowntime('critical-api', 5);
      tracker.recordDowntime('critical-api', 10);
      tracker.recordDowntime('critical-api', 7);

      const incidents = tracker.getIncidents('critical-api');
      const totalDowntime = incidents.reduce((sum, i) => sum + i.downtimeMinutes, 0);

      expect(totalDowntime).toBe(22);
    });
  });

  describe('Edge Cases & Data Validation', () => {
    it('should handle service IDs with special characters', () => {
      const serviceId = 'my-service.prod.eu-west-1';
      const event = tracker.recordDowntime(serviceId, 10);

      expect(event.serviceId).toBe(serviceId);
      expect(tracker.getIncidents(serviceId).length).toBe(1);
    });

    it('should preserve decimal downtime values', () => {
      const event = tracker.recordDowntime('service-123', 1.5, 'Brief glitch');

      expect(event.downtimeMinutes).toBe(1.5);
      expect(tracker.getIncidents('service-123')[0].downtimeMinutes).toBe(1.5);
    });

    it('should handle unicode characters in descriptions', () => {
      const description = '数据库维修 🚀 Database maintenance';
      const event = tracker.recordDowntime('service-123', 10, description);

      expect(tracker.getIncidents('service-123')[0].description).toBe(description);
    });

    it('should handle very long description strings', () => {
      const longDescription = 'A'.repeat(10000);
      const event = tracker.recordDowntime('service-123', 10, longDescription);

      expect(tracker.getIncidents('service-123')[0].description.length).toBe(10000);
    });

    it('should handle window start time of 0', () => {
      tracker.recordDowntime('service-123', 10);

      const incidents = tracker.getIncidents('service-123', 0);

      expect(incidents.length).toBe(1);
    });
  });
});
