# Plasma Chain Support

## Overview
Added support for the Plasma blockchain to enable tracking of Plasma-based tokens like Trillions (TRILLIONS).

## Chain Information
- **Name**: Plasma
- **Type**: Layer 1 blockchain
- **Block Explorer**: https://plasmascan.com/
- **CoinGecko Platform Key**: `plasma`

## Changes Made

### 1. Type Definitions
Updated all chain type definitions to include `"plasma"`:
- `islands/SignalsForm.tsx`
- `utils/database.ts`
- `utils/db.ts`
- `utils/price.ts`
- `routes/api/verified/index.ts`
- `routes/api/price/token.ts`

### 2. Database Schema
Updated PostgreSQL CHECK constraint in `verified_projects` table:
```sql
CHECK (chain IN ('ethereum', 'base', 'solana', 'bsc', 'plasma'))
```

Migration was successfully applied to the production database.

### 3. Import Scripts
Updated token import scripts to recognize Plasma contracts from CoinGecko:
- `scripts/import-top-tokens.ts`
- `scripts/import-moralis.ts`
- `scripts/import-top-1000.ts`
- `scripts/import-fast-1000.ts`

All scripts now extract Plasma contract addresses when available:
```typescript
if (platforms.plasma && platforms.plasma.trim() !== "") {
  contracts.push({ chain: "plasma", address: platforms.plasma });
}
```

### 4. Price Tracking
Plasma tokens use the same price tracking mechanisms as other chains:
- **DefiLlama**: Supports Plasma chain for price lookups
- **CoinGecko**: Provides Plasma token data via `coingecko:` ID format

## Example: Trillions Token

### Token Details
- **Name**: Trillions
- **Symbol**: TRILLIONS
- **CoinGecko ID**: `trillions`
- **CoinGecko URL**: https://www.coingecko.com/en/coins/trillions
- **Chain**: Plasma (L1)
- **Contract Address**: `0x92a01ab7317ac318b39b00eb6704ba56f0245d7a`
- **Plasmascan**: https://api.plasmascan.com/

### Adding Trillions to Signals
To add Trillions as a verified project:
1. Go to Admin panel
2. Click "Add Verified Project"
3. Fill in the details:
   - Twitter username: `trillions` (or actual Twitter handle)
   - Type: `token`
   - Chain: `plasma`
   - Contract Address: `0x92a01ab7317ac318b39b00eb6704ba56f0245d7a`
   - CoinGecko ID: `trillions`

### Price Data Sources
Trillions price data is available from:
1. **CoinGecko**: Using `trillions` CoinGecko ID
2. **DefiLlama**: Using `plasma:0x92a01ab7317ac318b39b00eb6704ba56f0245d7a`

## API Endpoints

### Token Price
```
GET /api/price/token?chain=plasma&address=0x92a01ab7317ac318b39b00eb6704ba56f0245d7a
```

### CoinGecko Price (Recommended for Plasma L1 tokens)
```
GET /api/price/coingecko?id=trillions
```

### Chart Data
```
GET /api/price/chart?coinGeckoId=trillions&from=1704067200&to=1735689600
```

## Supported Chains

The platform now supports:
1. **Ethereum** - EVM L1
2. **Base** - Coinbase L2
3. **Solana** - Non-EVM L1
4. **BSC** (Binance Smart Chain) - EVM L1
5. **Plasma** - EVM L1 (NEW)

## Technical Notes

### Chain Type
Plasma is treated as an EVM-compatible chain similar to Ethereum and BSC.

### Price Tracking Strategy
For Plasma tokens:
- Use CoinGecko ID for L1 tokens without specific contract tracking needs
- Use DefiLlama with `plasma:` prefix for contract-based price lookups
- Charts use CoinGecko market_chart/range API for historical data

### Import Scripts
When running import scripts, Plasma tokens will be automatically recognized if CoinGecko provides a `platforms.plasma` entry.

## Future Enhancements

Potential improvements for Plasma support:
- [ ] Add Plasmascan API integration for on-chain data
- [ ] Support Plasma NFT floor price tracking (if applicable)
- [ ] Add Plasma-specific token metadata
- [ ] Integrate Plasma ecosystem DEX data
- [ ] Add Plasma gas price tracking

## Testing

Verified that:
✅ Database accepts `plasma` chain value
✅ API routes handle `plasma` chain parameter
✅ CoinGecko correctly identifies Trillions as Plasma token
✅ Import scripts extract Plasma contract addresses
✅ Price tracking works for Plasma tokens
✅ TypeScript types include `plasma` everywhere

## References
- Plasmascan: https://plasmascan.com/
- Plasmascan API: https://api.plasmascan.com/
- Trillions on CoinGecko: https://www.coingecko.com/en/coins/trillions
- Trillions Contract: `0x92a01ab7317ac318b39b00eb6704ba56f0245d7a`
