const Database = require('better-sqlite3');
const { similarity } = require('../lib/fingerprinting');
const path = require('path');
const fs = require('fs');

// Ensure db directory exists
const dbPath = path.resolve(__dirname, '../../sentinel-memory.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

let db;
try {
    db = new Database(dbPath);
} catch (e) {
    console.error("Failed to initialize SQLite database:", e);
    // Fallback or exit? Should handle gracefully.
    // For now, let's assume it works or throw.
    throw e;
}

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS incident_memory (
    id TEXT PRIMARY KEY,
    container_name TEXT,
    fingerprint TEXT,
    incident_summary TEXT,
    resolution TEXT,
    action_taken TEXT,
    outcome TEXT,
    mttr_seconds INTEGER,
    feedback INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    last_accessed INTEGER DEFAULT (unixepoch())
  );
  
  -- Create index for faster sort by created_at although LIMIT cleans up
  CREATE INDEX IF NOT EXISTS idx_created_at ON incident_memory(created_at);
  CREATE INDEX IF NOT EXISTS idx_last_accessed ON incident_memory(last_accessed);
`);

// Migration for existing databases
try {
    const columns = db.pragma('table_info(incident_memory)');
    if (!columns.some(c => c.name === 'last_accessed')) {
        db.exec('ALTER TABLE incident_memory ADD COLUMN last_accessed INTEGER DEFAULT (unixepoch())');
        db.exec('CREATE INDEX IF NOT EXISTS idx_last_accessed ON incident_memory(last_accessed)');
    }
} catch (e) {
    console.error('Migration failed:', e);
}

function storeIncident(incident) {
  try {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO incident_memory
        (id, container_name, fingerprint, incident_summary, resolution, action_taken, outcome, mttr_seconds, created_at, last_accessed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())
    `);
    
    stmt.run(
        incident.id, 
        incident.containerName, 
        JSON.stringify(incident.fingerprint),
        incident.summary, 
        incident.resolution, 
        incident.actionTaken, 
        incident.outcome, 
        incident.mttrSeconds
    );
    
    // Maintain max 1000 incidents (LRU eviction based on last_accessed)
    const count = db.prepare('SELECT COUNT(*) as count FROM incident_memory').get().count;
    if (count > 1000) {
        db.prepare('DELETE FROM incident_memory WHERE id IN (SELECT id FROM incident_memory ORDER BY last_accessed ASC LIMIT 1)').run();
    }
  } catch (e) {
      console.error("Failed to store incident in memory:", e);
  }
}

function findSimilar(fingerprint, limit = 3) {
  try {
      // For 1000 rows, full table scan is negligible (~ms)
      const all = db.prepare('SELECT * FROM incident_memory ORDER BY created_at DESC LIMIT 1000').all();
      
      const results = all
        .map(row => {
            let fp;
            try {
                fp = JSON.parse(row.fingerprint);
            } catch (e) {
                fp = [];
            }
            return { 
                ...row, 
                score: similarity(fingerprint, fp) 
            };
        })
        .filter(r => r.score > 0.4)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Update LRU for accessed items
      if (results.length > 0) {
          const stmt = db.prepare('UPDATE incident_memory SET last_accessed = unixepoch() WHERE id = ?');
          const update = db.transaction((incidents) => {
              for (const incident of incidents) stmt.run(incident.id);
          });
          update(results);
      }

      return results;
  } catch (e) {
      console.error("Failed to find similar incidents:", e);
      return [];
  }
}

function updateFeedback(id, feedbackValue) {
    try {
        const stmt = db.prepare('UPDATE incident_memory SET feedback = ? WHERE id = ?');
        const info = stmt.run(feedbackValue, id);
        return info.changes > 0;
    } catch (e) {
        console.error("Failed to update feedback:", e);
        return false;
    }
}

module.exports = { storeIncident, findSimilar, updateFeedback };
