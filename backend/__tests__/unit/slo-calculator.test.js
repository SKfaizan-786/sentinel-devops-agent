/**
 * SLO Calculator Unit Tests
 * 
 * Tests for error budget calculations, burndown projections,
 * and SLO status determinations.
 */

const {
  calculateErrorBudget,
  generateBurndownData,
  MINUTES_PER_WINDOW,
} = require('../../slo/calculator');

describe('SLO Calculator - Unit Tests', () => {
  describe('Error Budget Calculation', () => {
    it('should calculate error budget for monthly SLO', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const incidents = [];

      const budget = calculateErrorBudget(sloDefinition, incidents);

      expect(budget).toHaveProperty('allowedDowntimeMinutes');
      expect(budget).toHaveProperty('totalDowntimeMinutes');
      expect(budget).toHaveProperty('remainingMinutes');
      expect(budget).toHaveProperty('budgetPercent');
      expect(budget).toHaveProperty('currentAvailability');
      expect(budget).toHaveProperty('status');
    });

    it('should calculate allowed downtime based on target availability', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };

      const budget = calculateErrorBudget(sloDefinition, []);

      // 99.9% = 99.9% uptime, 0.1% downtime
      // 0.1% of 30 days * 24 hours * 60 minutes = 43.2 minutes
      expect(budget.allowedDowntimeMinutes).toBeCloseTo(43.2, 1);
    });

    it('should track downtime from incidents', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const incidents = [
        { downtimeMinutes: 20, resolvedAt: Date.now() },
        { downtimeMinutes: 15, resolvedAt: Date.now() },
      ];

      const budget = calculateErrorBudget(sloDefinition, incidents);

      expect(budget.totalDowntimeMinutes).toBe(35);
    });

    it('should calculate remaining budget', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const incidents = [{ downtimeMinutes: 20, resolvedAt: Date.now() }];

      const budget = calculateErrorBudget(sloDefinition, incidents);

      // 43.2 - 20 = 23.2
      expect(budget.remainingMinutes).toBeCloseTo(23.2, 1);
    });

    it('should return healthy status when budget remains', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const incidents = [{ downtimeMinutes: 10, resolvedAt: Date.now() }];

      const budget = calculateErrorBudget(sloDefinition, incidents);

      expect(budget.status).toBe('healthy');
      expect(budget.budgetPercent).toBeGreaterThan(0);
    });

    it('should return warning status when budget is low', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      // Use 35 minutes of 43.2 minute budget
      const incidents = [{ downtimeMinutes: 35, resolvedAt: Date.now() }];

      const budget = calculateErrorBudget(sloDefinition, incidents);

      expect(budget.status).toBe('warning');
      expect(budget.budgetPercent).toBeLessThan(25);
    });

    it('should return critical status when budget is critically low', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      // Use 40 minutes of 43.2 minute budget
      const incidents = [{ downtimeMinutes: 40, resolvedAt: Date.now() }];

      const budget = calculateErrorBudget(sloDefinition, incidents);

      expect(budget.status).toBe('critical');
      expect(budget.budgetPercent).toBeLessThan(10);
    });

    it('should return exhausted status when budget is exceeded', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const incidents = [{ downtimeMinutes: 50, resolvedAt: Date.now() }];

      const budget = calculateErrorBudget(sloDefinition, incidents);

      expect(budget.status).toBe('exhausted');
      expect(budget.budgetPercent).toBe(0);
      expect(budget.remainingMinutes).toBe(0);
    });

    it('should filter incidents outside tracking window', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const now = Date.now();
      const twoMonthsAgo = now - 60 * 24 * 60 * 60 * 1000;

      const incidents = [
        { downtimeMinutes: 20, resolvedAt: now }, // Within window
        { downtimeMinutes: 30, resolvedAt: twoMonthsAgo }, // Outside window
      ];

      const budget = calculateErrorBudget(sloDefinition, incidents);

      // Should only count the 20 minutes
      expect(budget.totalDowntimeMinutes).toBe(20);
    });

    it('should calculate current availability percentage', () => {
      const sloDefinition = {
        targetAvailability: 99.0,
        trackingWindow: '1day',
      };
      // 1 day = 1440 minutes
      const incidents = [{ downtimeMinutes: 14.4, resolvedAt: Date.now() }]; // 1% downtime

      const budget = calculateErrorBudget(sloDefinition, incidents);

      expect(budget.currentAvailability).toBeCloseTo(99.0, 1);
    });

    it('should calculate burndown rate per day', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '7days',
      };
      const incidents = [{ downtimeMinutes: 10, resolvedAt: Date.now() }];

      const budget = calculateErrorBudget(sloDefinition, incidents);

      expect(budget.burndownRatePerDay).toBeGreaterThan(0);
    });

    it('should project exhaustion date when burning down', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '7days',
      };
      const incidents = [{ downtimeMinutes: 10, resolvedAt: Date.now() }];

      const budget = calculateErrorBudget(sloDefinition, incidents);

      if (budget.projectedExhaustionDate) {
        const exhaustionDate = new Date(budget.projectedExhaustionDate);
        expect(exhaustionDate.getTime()).toBeGreaterThan(Date.now());
      }
    });

    it('should handle different tracking windows', () => {
      const targetAvailability = 99.9;
      const windows = ['1day', '7days', '1month'];

      windows.forEach((window) => {
        const budget = calculateErrorBudget(
          { targetAvailability, trackingWindow: window },
          []
        );

        expect(budget.allowedDowntimeMinutes).toBeGreaterThan(0);
        expect(budget.status).toBe('healthy');
      });
    });

    it('should throw error on invalid tracking window', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: 'invalid',
      };

      expect(() => {
        calculateErrorBudget(sloDefinition, []);
      }).toThrow('Invalid tracking window');
    });
  });

  describe('Burndown Data Generation', () => {
    it('should generate burndown data points', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const incidents = [];

      const burndown = generateBurndownData(sloDefinition, incidents);

      expect(Array.isArray(burndown)).toBe(true);
      expect(burndown.length).toBeGreaterThan(0);
    });

    it('should include date, budget, and accumulation in each point', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const incidents = [];

      const burndown = generateBurndownData(sloDefinition, incidents);

      const point = burndown[0];
      expect(point).toHaveProperty('date');
      expect(point).toHaveProperty('budgetRemaining');
      expect(point).toHaveProperty('downtimeAccumulated');
    });

    it('should show budget decreasing over time with incidents', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const incidents = [{ downtimeMinutes: 5, resolvedAt: Date.now() }];

      const burndown = generateBurndownData(sloDefinition, incidents);

      // Budget should decrease (remaining should decrease)
      expect(burndown[0].budgetRemaining).toBeLessThan(100);
    });

    it('should return 30 points by default', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };

      const burndown = generateBurndownData(sloDefinition, []);

      expect(burndown.length).toBe(30);
    });

    it('should support custom number of points', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };

      const burndown = generateBurndownData(sloDefinition, [], 10);

      expect(burndown.length).toBeGreaterThan(0);
    });

    it('should render correct progression without incidents', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };

      const burndown = generateBurndownData(sloDefinition, [], 5);

      // Without incidents, budget should remain at 100%
      expect(burndown[0].budgetRemaining).toBeCloseTo(100, 0);
      expect(burndown[burndown.length - 1].downtimeAccumulated).toBe(0);
    });
  });

  describe('Window Constants', () => {
    it('should define minutes per window correctly', () => {
      expect(MINUTES_PER_WINDOW).toHaveProperty('1day');
      expect(MINUTES_PER_WINDOW).toHaveProperty('7days');
      expect(MINUTES_PER_WINDOW).toHaveProperty('1month');
    });

    it('should have correct calculations for 1day window', () => {
      expect(MINUTES_PER_WINDOW['1day']).toBe(24 * 60); // 1440
    });

    it('should have correct calculations for 7days window', () => {
      expect(MINUTES_PER_WINDOW['7days']).toBe(7 * 24 * 60); // 10080
    });

    it('should have correct calculations for 1month window', () => {
      expect(MINUTES_PER_WINDOW['1month']).toBe(30 * 24 * 60); // 43200
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty incident list', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };

      const budget = calculateErrorBudget(sloDefinition, []);

      expect(budget.totalDowntimeMinutes).toBe(0);
      expect(budget.status).toBe('healthy');
    });

    it('should handle null or undefined incidents gracefully', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };

      const budget = calculateErrorBudget(sloDefinition, undefined);

      expect(budget).toBeDefined();
    });

    it('should handle very high target availability (99.999)', () => {
      const sloDefinition = {
        targetAvailability: 99.999,
        trackingWindow: '1month',
      };

      const budget = calculateErrorBudget(sloDefinition, []);

      // 0.001% downtime allowed = ~0.432 minutes
      expect(budget.allowedDowntimeMinutes).toBeLessThan(1);
    });

    it('should handle very low target availability (90)', () => {
      const sloDefinition = {
        targetAvailability: 90,
        trackingWindow: '1month',
      };

      const budget = calculateErrorBudget(sloDefinition, []);

      // 10% downtime allowed = 4320 minutes
      expect(budget.allowedDowntimeMinutes).toBeGreaterThan(4000);
    });

    it('should cap remaining minutes at zero', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const incidents = [{ downtimeMinutes: 1000, resolvedAt: Date.now() }];

      const budget = calculateErrorBudget(sloDefinition, incidents);

      expect(budget.remainingMinutes).toBe(0);
    });

    it('should handle incidents with missing resolvedAt field', () => {
      const sloDefinition = {
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const incidents = [
        { downtimeMinutes: 10, createdAt: Date.now(), resolvedAt: undefined },
      ];

      const budget = calculateErrorBudget(sloDefinition, incidents);

      expect(budget).toBeDefined();
    });
  });
});
