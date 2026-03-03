/**
 * Unit Tests: RBAC Service
 * Tests role-based access control logic
 */

// Mock database
const mockDb = {
  query: jest.fn(),
};

jest.mock('../../db/config', () => ({
  query: (...args) => mockDb.query(...args),
}));

const RBACService = require('../../auth/RBACService');

describe('Unit: RBAC Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return true when user has required permission', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ permission_name: 'docker:restart' }],
      });

      const result = await RBACService.hasPermission(1, 'docker:restart');

      expect(result).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1, 'docker:restart']
      );
    });

    it('should return false when user lacks permission', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await RBACService.hasPermission(1, 'docker:delete');

      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await RBACService.hasPermission(1, 'docker:restart');

      expect(result).toBe(false);
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          { role_id: 1, role_name: 'admin' },
          { role_id: 2, role_name: 'operator' },
        ],
      });

      const roles = await RBACService.getUserRoles(1);

      expect(roles).toHaveLength(2);
      expect(roles[0].role_name).toBe('admin');
    });

    it('should return empty array for user with no roles', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const roles = await RBACService.getUserRoles(999);

      expect(roles).toEqual([]);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ user_id: 1, role_id: 2 }],
      });

      const result = await RBACService.assignRole(1, 2);

      expect(result).toBeDefined();
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT'),
        [1, 2]
      );
    });

    it('should handle duplicate role assignment', async () => {
      mockDb.query.mockRejectedValueOnce({ code: '23505' }); // Unique violation

      await expect(RBACService.assignRole(1, 2)).rejects.toThrow();
    });
  });
});
