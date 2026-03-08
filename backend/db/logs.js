const pool = require('./config');

/**
 * Inserts a new activity log entry into the database.
 */
async function insertActivityLog(type, message) {
  const query = 'INSERT INTO activity_logs (type, message) VALUES ($1, $2) RETURNING *';
  const values = [type, message];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

/**
 * Retrieves activity logs with pagination.
 */
async function getActivityLogs(limit = 50, offset = 0) {
  const query = 'SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT $1 OFFSET $2';
  const countQuery = 'SELECT COUNT(*) FROM activity_logs';
  
  const [logsRes, countRes] = await Promise.all([
    pool.query(query, [limit, offset]),
    pool.query(countQuery)
  ]);
  
  return {
    logs: logsRes.rows,
    total: parseInt(countRes.rows[0].count, 10)
  };
}

/**
 * Inserts a new AI report into the database.
 */
async function insertAIReport(analysis, summary) {
  const query = 'INSERT INTO ai_reports (analysis, summary) VALUES ($1, $2) RETURNING *';
  const values = [analysis, summary];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

/**
 * Retrieves AI reports with pagination.
 */
async function getAIReports(limit = 20, offset = 0) {
  const query = 'SELECT * FROM ai_reports ORDER BY timestamp DESC LIMIT $1 OFFSET $2';
  const countQuery = 'SELECT COUNT(*) FROM ai_reports';
  
  const [reportsRes, countRes] = await Promise.all([
    pool.query(query, [limit, offset]),
    pool.query(countQuery)
  ]);
  
  return {
    reports: reportsRes.rows,
    total: parseInt(countRes.rows[0].count, 10)
  };
}

module.exports = {
  insertActivityLog,
  getActivityLogs,
  insertAIReport,
  getAIReports
};
