-- Add hyperliquid to allowed chains
-- Migration: 003_add_hyperliquid_chain.sql
-- Date: 2025-10-02

-- Drop the old constraint
ALTER TABLE verified_projects
DROP CONSTRAINT verified_projects_chain_check;

-- Add new constraint with hyperliquid
ALTER TABLE verified_projects
ADD CONSTRAINT verified_projects_chain_check
CHECK (chain IN ('ethereum', 'base', 'solana', 'bsc', 'plasma', 'hyperliquid'));

