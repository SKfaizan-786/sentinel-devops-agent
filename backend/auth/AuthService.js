const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/config');
const { getSecretSync } = require('../lib/secrets');

const BCRYPT_ROUNDS = 12;

// Validate JWT_SECRET is set (using secrets module with env fallback)
const JWT_SECRET = getSecretSync('JWT_SECRET');
if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not set.');
  console.error('Please set JWT_SECRET in Vault or your .env file before starting the server.');
  process.exit(1);
}

const JWT_ACCESS_EXPIRY = getSecretSync('JWT_ACCESS_EXPIRY', '15m');
const JWT_REFRESH_EXPIRY = getSecretSync('JWT_REFRESH_EXPIRY', '7d');
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

class AuthService {
  /**
   * Hash a password using bcrypt with 12 rounds
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} - True if password matches
   */
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT access token
   * @param {object} user - User object
   * @param {array} roles - User roles
   * @param {array} permissions - User permissions
   * @returns {string} - JWT token
   */
  generateAccessToken(user, roles, permissions) {
    const payload = {
      userId: user.id,
      email: user.email,
      organizationId: user.organization_id,
      roles: roles.map(r => r.name),
      permissions: permissions.map(p => p.name)
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
  }

  /**
   * Generate a refresh token and store it in database
   * @param {string} userId - User ID
   * @param {object} deviceInfo - Device information
   * @returns {Promise<string>} - Refresh token
   */
  async generateRefreshToken(userId, deviceInfo = {}) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await pool.query(
      `INSERT INTO refresh_tokens (token_hash, user_id, device_info, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [tokenHash, userId, JSON.stringify(deviceInfo), expiresAt]
    );
    
    return token;
  }

  /**
   * Validate a JWT access token
   * @param {string} token - JWT token
   * @returns {object} - Decoded token payload
   * @throws {Error} - If token is invalid or expired
   */
  validateAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  }

  /**
   * Record a failed login attempt
   * @param {string} email - User email
   * @returns {Promise<object>} - Attempts remaining and lock status
   */
  async recordFailedLogin(email) {
    const result = await pool.query(
      `UPDATE users 
       SET failed_login_attempts = failed_login_attempts + 1,
           updated_at = NOW()
       WHERE email = $1
       RETURNING failed_login_attempts, locked_until`,
      [email]
    );
    
    if (result.rows.length === 0) {
      return { attemptsRemaining: MAX_FAILED_ATTEMPTS, lockedUntil: null };
    }
    
    const user = result.rows[0];
    const attempts = user.failed_login_attempts;
    
    // Lock account if max attempts reached
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      await pool.query(
        `UPDATE users SET locked_until = $1 WHERE email = $2`,
        [lockedUntil, email]
      );
      return { attemptsRemaining: 0, lockedUntil };
    }
    
    return {
      attemptsRemaining: MAX_FAILED_ATTEMPTS - attempts,
      lockedUntil: null
    };
  }

  /**
   * Clear failed login attempts
   * @param {string} userId - User ID
   */
  async clearFailedLogins(userId) {
    await pool.query(
      `UPDATE users 
       SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  }

  /**
   * Check if account is locked
   * @param {object} user - User object
   * @returns {boolean} - True if account is locked
   */
  isAccountLocked(user) {
    if (!user.locked_until) return false;
    return new Date(user.locked_until) > new Date();
  }

  /**
   * Get user roles and permissions
   * @param {string} userId - User ID
   * @returns {Promise<object>} - Roles and permissions
   */
  async getUserRolesAndPermissions(userId) {
    // Get user roles
    const rolesResult = await pool.query(
      `SELECT r.id, r.name, r.description
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    
    // Get permissions from roles
    const permissionsResult = await pool.query(
      `SELECT DISTINCT p.id, p.name, p.resource, p.action, p.description
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    
    return {
      roles: rolesResult.rows,
      permissions: permissionsResult.rows
    };
  }

  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {object} deviceInfo - Device information
   * @returns {Promise<object>} - Access token, refresh token, and user info
   * @throws {Error} - If credentials are invalid or account is locked
   */
  async login(email, password, deviceInfo = {}) {
    // Get user
    const userResult = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('Invalid credentials');
    }
    
    const user = userResult.rows[0];
    
    // Check if account is locked
    if (this.isAccountLocked(user)) {
      const lockedUntil = new Date(user.locked_until);
      throw new Error(`Account locked until ${lockedUntil.toISOString()}`);
    }
    
    // Verify password
    const isValid = await this.verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      const lockInfo = await this.recordFailedLogin(email);
      if (lockInfo.attemptsRemaining === 0) {
        throw new Error(`Account locked due to too many failed attempts. Try again after ${lockInfo.lockedUntil.toISOString()}`);
      }
      throw new Error(`Invalid credentials. ${lockInfo.attemptsRemaining} attempts remaining`);
    }
    
    // Clear failed login attempts
    await this.clearFailedLogins(user.id);
    
    // Get roles and permissions
    const { roles, permissions } = await this.getUserRolesAndPermissions(user.id);
    
    // Generate tokens
    const accessToken = this.generateAccessToken(user, roles, permissions);
    const refreshToken = await this.generateRefreshToken(user.id, deviceInfo);
    
    // Remove sensitive data
    delete user.password_hash;
    delete user.failed_login_attempts;
    delete user.locked_until;
    
    return {
      accessToken,
      refreshToken,
      user: {
        ...user,
        roles: roles.map(r => r.name),
        permissions: permissions.map(p => p.name)
      }
    };
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<object>} - New access token and refresh token
   * @throws {Error} - If refresh token is invalid or expired
   */
  async refreshToken(refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Find refresh token
    const result = await pool.query(
      `SELECT rt.*, u.id as user_id, u.email, u.organization_id
       FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = $1 AND rt.expires_at > NOW()`,
      [tokenHash]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Invalid or expired refresh token');
    }
    
    const tokenData = result.rows[0];
    
    // Delete old refresh token (token rotation)
    await pool.query(
      `DELETE FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash]
    );
    
    // Get user roles and permissions
    const { roles, permissions } = await this.getUserRolesAndPermissions(tokenData.user_id);
    
    // Generate new tokens
    const user = {
      id: tokenData.user_id,
      email: tokenData.email,
      organization_id: tokenData.organization_id
    };
    
    const newAccessToken = this.generateAccessToken(user, roles, permissions);
    const newRefreshToken = await this.generateRefreshToken(tokenData.user_id, tokenData.device_info);
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }

  /**
   * Logout user (revoke all refresh tokens)
   * @param {string} userId - User ID
   */
  async logout(userId) {
    await pool.query(
      `DELETE FROM refresh_tokens WHERE user_id = $1`,
      [userId]
    );
    return { success: true };
  }

  /**
   * Logout specific session (revoke specific refresh token)
   * @param {string} refreshTokenId - Refresh token ID
   */
  async logoutSession(refreshTokenId) {
    await pool.query(
      `DELETE FROM refresh_tokens WHERE id = $1`,
      [refreshTokenId]
    );
    return { success: true };
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<string>} - Reset token
   */
  async requestPasswordReset(email) {
    // Check if user exists
    const userResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );
    
    if (userResult.rows.length === 0) {
      // Don't reveal if email exists
      return { success: true };
    }
    
    const userId = userResult.rows[0].id;
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Store reset token
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
    
    // In production, send email with reset token
    // For now, return the token (in production, this would be sent via email)
    return { resetToken };
  }

  /**
   * Reset password using reset token
   * @param {string} resetToken - Reset token
   * @param {string} newPassword - New password
   */
  async resetPassword(resetToken, newPassword) {
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Find valid reset token
    const result = await pool.query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND expires_at > NOW() AND used = FALSE`,
      [tokenHash]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }
    
    const userId = result.rows[0].user_id;
    
    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);
    
    // Update password
    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId]
    );
    
    // Mark token as used
    await pool.query(
      `UPDATE password_reset_tokens SET used = TRUE WHERE token_hash = $1`,
      [tokenHash]
    );
    
    // Revoke all refresh tokens
    await this.logout(userId);
    
    return { success: true };
  }
}

module.exports = new AuthService();
