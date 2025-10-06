-- Extension Authentication and Rate Limiting Tables

-- Table for storing extension authentication tokens
CREATE TABLE IF NOT EXISTS extension_auth_tokens (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  ethos_profile_id INTEGER,
  ethos_username TEXT,
  auth_token TEXT NOT NULL UNIQUE,
  device_identifier TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Index for quick token lookups
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON extension_auth_tokens(auth_token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_wallet ON extension_auth_tokens(wallet_address);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_active ON extension_auth_tokens(is_active, expires_at);

-- Table for rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  id TEXT PRIMARY KEY,
  auth_token TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL DEFAULT NOW(),
  last_request_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (auth_token) REFERENCES extension_auth_tokens(auth_token) ON DELETE CASCADE
);

-- Index for rate limit queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_token ON rate_limit_tracking(auth_token, endpoint, window_start);

-- Add auth_token column to signals table to track who created each signal
ALTER TABLE signals ADD COLUMN IF NOT EXISTS auth_token TEXT;
CREATE INDEX IF NOT EXISTS idx_signals_auth_token ON signals(auth_token);

