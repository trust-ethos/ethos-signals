-- Migration 007: Add Disclosure Status to Paid Promo Reports
-- Adds the ability to track whether a paid promo is disclosed or undisclosed

ALTER TABLE paid_promo_reports 
ADD COLUMN disclosure_status TEXT NOT NULL DEFAULT 'disclosed' 
CHECK (disclosure_status IN ('disclosed', 'undisclosed'));

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_paid_promo_disclosure_status ON paid_promo_reports (disclosure_status);

-- Comment the column
COMMENT ON COLUMN paid_promo_reports.disclosure_status IS 'Whether the paid promotion was disclosed or undisclosed';

