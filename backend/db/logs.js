/**
 * @fileoverview Database models for activity logs and AI analysis reports
 * @module backend/db/logs
 */

const pool = require('./config');

/**
 * Insert an activity log entry into the database
 * @param {string} type - Log type (e.g., 'info', 'success', 'warn', 'alert', 'error')
 * @param {string} message - Log message
 * @returns {Promise<object>} The inserted log entry
 */
async function insertActivityLog(type, message) {
    try {
        const result = await pool.query(
            'INSERT INTO activity_logs (type, message) VALUES ($1, $2) RETURNING *',
            [type, message]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Failed to insert activity log:', error.message);
        return null;
    }
}

/**
 * Fetch activity logs with pagination
 * @param {number} limit - Max number of results
 * @param {number} offset - Offset for pagination
 * @returns {Promise<{logs: object[], total: number}>}
 */
async function getActivityLogs(limit = 50, offset = 0) {
    try {
        const [logsResult, countResult] = await Promise.all([
            pool.query(
                'SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            ),
            pool.query('SELECT COUNT(*) FROM activity_logs')
        ]);
        return {
            logs: logsResult.rows,
            total: parseInt(countResult.rows[0].count, 10)
        };
    } catch (error) {
        console.error('Failed to fetch activity logs:', error.message);
        return { logs: [], total: 0 };
    }
}

/**
 * Insert an AI analysis report into the database
 * @param {string} analysis - Full AI analysis text
 * @param {string} summary - Short summary
 * @returns {Promise<object>} The inserted report
 */
async function insertAIReport(analysis, summary) {
    try {
        const result = await pool.query(
            'INSERT INTO ai_analysis_reports (analysis, summary) VALUES ($1, $2) RETURNING *',
            [analysis, summary || analysis]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Failed to insert AI report:', error.message);
        return null;
    }
}

/**
 * Fetch AI analysis reports with pagination
 * @param {number} limit - Max number of results
 * @param {number} offset - Offset for pagination
 * @returns {Promise<{reports: object[], total: number}>}
 */
async function getAIReports(limit = 20, offset = 0) {
    try {
        const [reportsResult, countResult] = await Promise.all([
            pool.query(
                'SELECT * FROM ai_analysis_reports ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            ),
            pool.query('SELECT COUNT(*) FROM ai_analysis_reports')
        ]);
        return {
            reports: reportsResult.rows,
            total: parseInt(countResult.rows[0].count, 10)
        };
    } catch (error) {
        console.error('Failed to fetch AI reports:', error.message);
        return { reports: [], total: 0 };
    }
}

module.exports = { insertActivityLog, getActivityLogs, insertAIReport, getAIReports };
