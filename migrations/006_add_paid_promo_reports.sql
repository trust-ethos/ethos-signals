-- Migration 006: Add Paid Promo Reports
-- This migration adds support for users to report tweets as paid promotions

-- Create paid_promo_reports table
CREATE TABLE IF NOT EXISTS paid_promo_reports (
  id TEXT PRIMARY KEY,
  tweet_url TEXT NOT NULL,
  twitter_username TEXT NOT NULL,
  evidence TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auth_token TEXT,
  CONSTRAINT fk_auth_token 
    FOREIGN KEY (auth_token) 
    REFERENCES extension_auth_tokens(auth_token)
    ON DELETE SET NULL,
  CONSTRAINT unique_tweet_reporter 
    UNIQUE (tweet_url, auth_token)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_paid_promo_twitter_username ON paid_promo_reports (twitter_username);
CREATE INDEX IF NOT EXISTS idx_paid_promo_tweet_url ON paid_promo_reports (tweet_url);
CREATE INDEX IF NOT EXISTS idx_paid_promo_reported_at ON paid_promo_reports (reported_at);
CREATE INDEX IF NOT EXISTS idx_paid_promo_auth_token ON paid_promo_reports (auth_token);

-- Comment the table
COMMENT ON TABLE paid_promo_reports IS 'Reports from users flagging tweets as potential paid promotions';

