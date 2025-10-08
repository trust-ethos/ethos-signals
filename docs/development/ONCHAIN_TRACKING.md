# Onchain Signal Tracking

## Overview
Signals are now automatically tracked on the Base blockchain when saved. Each signal that's saved on-chain will display a "View Onchain" link alongside "View Tweet" in the UI.

## Features Added

### 1. **Database Schema**
- Added `onchain_tx_hash` (VARCHAR 66) - stores the Base blockchain transaction hash
- Added `onchain_signal_id` (BIGINT) - stores the ID in the SignalsAttestation smart contract
- Both fields are indexed for fast lookups

### 2. **API Integration**
- The `/api/signals/[username]` endpoint now automatically saves signals on-chain when:
  - `ENABLE_ONCHAIN_SIGNALS=true` is set in `.env`
  - `PRIVATE_KEY` is configured with a funded wallet on Base
- Transaction hash and signal ID are stored in the database
- Onchain saves are non-blocking - if blockchain save fails, the signal still saves to the database

### 3. **UI Updates**
All signal display components now show a **green "View Onchain" link** when a signal has blockchain data:
- `SignalsForm.tsx` - Profile signals page
- `RecentSignalsInfinite.tsx` - Main signals feed
- `TokenPageIsland.tsx` - Token project pages
- `NFTPageIsland.tsx` - NFT project pages
- `PreTGEPageIsland.tsx` - Pre-TGE project pages

The link opens the transaction on BaseScan: `https://basescan.org/tx/{txHash}`

### 4. **Metadata Optimization**
Minimized on-chain metadata to save gas costs:
- **Before**: ~200+ bytes (username, project details, avatar URLs)
- **After**: ~100 bytes (only timestamps)
  ```json
  {
    "dateTimeOfPost": "2025-10-01T14:23:45.000Z",
    "dateTimeOfSave": "2025-10-01T15:30:12.123Z"
  }
  ```

## Configuration

### Enable Onchain Saving
```bash
# In .env
ENABLE_ONCHAIN_SIGNALS=true
PRIVATE_KEY=0x... # Your wallet private key (must have ETH on Base)
BASE_RPC_URL=https://mainnet.base.org
SIGNALS_CONTRACT_ADDRESS=0x1e8feced8227c6b85535669ebcea967fb259a87b
```

### Disable Onchain Saving
```bash
# In .env
ENABLE_ONCHAIN_SIGNALS=false
# or remove the PRIVATE_KEY
```

## Migration

To migrate existing signals to the blockchain, use:
```bash
deno run --allow-net --allow-env --allow-read scripts/migrate-all-signals.ts
```

**Note**: This costs real ETH on Base mainnet (~$0.02 per signal).

## Contract Information

- **Contract Address**: `0x1e8feced8227c6b85535669ebcea967fb259a87b`
- **Network**: Base Mainnet
- **Explorer**: https://basescan.org/address/0x1e8feced8227c6b85535669ebcea967fb259a87b

## How It Works

1. **User saves a signal** via Chrome extension
2. **API receives the signal** at `/api/signals/[username]`
3. **If onchain enabled**:
   - Creates transaction on Base blockchain
   - Waits for confirmation
   - Stores `txHash` and `signalId` in database
4. **Signal displays in UI** with both "View Tweet" and "View Onchain" links

## Benefits

- **Transparency**: All signals are publicly verifiable on the blockchain
- **Immutability**: Once saved, signals can't be altered
- **Ownership**: Signals are tied to the wallet address that saved them
- **Trust**: Users can verify signals haven't been manipulated

## Cost Considerations

- **Gas per signal**: ~$0.01-0.03 (varies with Base network congestion)
- **Database**: No additional cost (fields are nullable)
- **Performance**: Non-blocking - UI responds immediately while blockchain save happens in background

## Future Enhancements

- Display onchain badge/icon on signal cards
- Filter by "onchain verified" signals
- Show gas cost estimates before saving
- Batch multiple signals into single transaction
- Add "archive" functionality (sets archived flag on contract)

