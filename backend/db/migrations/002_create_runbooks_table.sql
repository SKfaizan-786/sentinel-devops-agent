-- Migration 002: Create runbooks and runbook_versions tables

CREATE TABLE IF NOT EXISTS runbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    triggers JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '[]',
    connections JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    webhook_secret VARCHAR(128),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_runbooks_enabled ON runbooks(enabled);
CREATE INDEX IF NOT EXISTS idx_runbooks_created_by ON runbooks(created_by);

-- Runbook versions table (for rollback support)
CREATE TABLE IF NOT EXISTS runbook_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    runbook_id UUID NOT NULL REFERENCES runbooks(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Prevent duplicate (runbook_id, version) pairs
    CONSTRAINT runbook_versions_runbook_version_unique UNIQUE (runbook_id, version)
);

CREATE INDEX IF NOT EXISTS idx_runbook_versions_runbook_id ON runbook_versions(runbook_id);
