-- FinOps & Cost Optimization Schema
-- Stores historical metric snapshots and AI-generated right-sizing recommendations

CREATE TABLE IF NOT EXISTS finops_metric_snapshots (
    id SERIAL PRIMARY KEY,
    container_id VARCHAR(128) NOT NULL,
    container_name VARCHAR(255) NOT NULL,
    cpu_percent NUMERIC(8,4) DEFAULT 0,
    memory_usage_bytes BIGINT DEFAULT 0,
    memory_limit_bytes BIGINT DEFAULT 0,
    memory_percent NUMERIC(8,4) DEFAULT 0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finops_snapshots_container
    ON finops_metric_snapshots(container_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_finops_snapshots_recorded
    ON finops_metric_snapshots(recorded_at);

CREATE TABLE IF NOT EXISTS finops_recommendations (
    id SERIAL PRIMARY KEY,
    container_id VARCHAR(128) NOT NULL,
    container_name VARCHAR(255) NOT NULL,
    current_cpu_avg NUMERIC(8,4) DEFAULT 0,
    current_memory_avg_mb NUMERIC(12,2) DEFAULT 0,
    current_memory_limit_mb NUMERIC(12,2) DEFAULT 0,
    recommended_memory_limit_mb NUMERIC(12,2) DEFAULT 0,
    estimated_savings_monthly NUMERIC(10,2) DEFAULT 0,
    reasoning TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'applied', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finops_recommendations_status
    ON finops_recommendations(status);

CREATE INDEX IF NOT EXISTS idx_finops_recommendations_container
    ON finops_recommendations(container_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_finops_recommendations_unique_pending
    ON finops_recommendations(container_id) WHERE status = 'pending';
