-- Migration: Add project suggestion and verification tracking
-- This allows users to suggest projects and admins to approve them

-- Add verification tracking to verified_projects
ALTER TABLE verified_projects 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS suggested_by_auth_token TEXT,
ADD COLUMN IF NOT EXISTS suggested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS verified_by TEXT;

-- Create rate limiting table for suggestions
CREATE TABLE IF NOT EXISTS project_suggestion_rate_limit (
  id TEXT PRIMARY KEY,
  auth_token TEXT NOT NULL,
  suggestion_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  last_suggestion_at TIMESTAMPTZ NOT NULL,
  FOREIGN KEY (auth_token) REFERENCES extension_auth_tokens(auth_token) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_suggestion_rate_limit ON project_suggestion_rate_limit(auth_token, window_start);
CREATE INDEX IF NOT EXISTS idx_verified_projects_verified ON verified_projects(is_verified);
CREATE INDEX IF NOT EXISTS idx_verified_projects_suggested_by ON verified_projects(suggested_by_auth_token);

-- Backfill existing projects as verified
UPDATE verified_projects 
SET is_verified = TRUE, 
    verified_at = COALESCE(created_at, NOW())
WHERE is_verified IS NULL;

