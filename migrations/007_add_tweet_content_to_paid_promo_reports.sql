-- Migration 007: Add tweet content to paid promo reports
-- This migration adds tweet_content column to store the actual tweet text

-- Add tweet_content column to paid_promo_reports table
ALTER TABLE paid_promo_reports 
ADD COLUMN IF NOT EXISTS tweet_content TEXT;

-- Comment the new column
COMMENT ON COLUMN paid_promo_reports.tweet_content IS 'The content/text of the tweet that was reported as paid promo';