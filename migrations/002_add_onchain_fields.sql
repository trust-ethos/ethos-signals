-- Add onchain tracking fields to signals table
ALTER TABLE signals 
ADD COLUMN IF NOT EXISTS onchain_tx_hash VARCHAR(66),
ADD COLUMN IF NOT EXISTS onchain_signal_id BIGINT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_signals_onchain_tx_hash ON signals(onchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_signals_onchain_signal_id ON signals(onchain_signal_id);

-- Add comment for documentation
COMMENT ON COLUMN signals.onchain_tx_hash IS 'Transaction hash on Base blockchain';
COMMENT ON COLUMN signals.onchain_signal_id IS 'Signal ID in the SignalsAttestation smart contract';

