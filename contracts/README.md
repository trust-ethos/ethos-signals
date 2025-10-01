# SignalsAttestation Smart Contract

Store crypto trading signals permanently onchain, modeled after the Ethos review contract pattern.

## Quick Start

### 1. Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### 2. Set Up Environment

Copy `.env.example` to `.env` and fill in:

```bash
# Required for deployment
PRIVATE_KEY=0x...
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=...

# Set after deployment
SIGNALS_CONTRACT_ADDRESS=0x...
```

### 3. Deploy Contract

For testnet (Base Sepolia):
```bash
forge create \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --etherscan-api-key $BASESCAN_API_KEY \
  --verify \
  contracts/SignalsAttestation.sol:SignalsAttestation
```

For mainnet (Base):
```bash
forge create \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --etherscan-api-key $BASESCAN_API_KEY \
  --verify \
  contracts/SignalsAttestation.sol:SignalsAttestation
```

Or use the helper script:
```bash
deno run scripts/deploy-signals-contract.ts
```

### 4. Update Environment

After deployment, add the contract address to your `.env`:
```bash
SIGNALS_CONTRACT_ADDRESS=0x...
```

### 5. Test It

Read from contract (no gas):
```bash
deno run scripts/test-contract-read.ts
```

Create a test signal (costs gas):
```bash
deno run scripts/create-test-signal.ts
```

## Contract Overview

### What It Stores

Each signal contains:
- **Author**: Ethereum address who saved the signal
- **Subject**: Project identifier (e.g., "ethereum", "uniswap")
- **Tweet URL**: Source of the signal
- **Tweet Content**: The actual text
- **Sentiment**: Bullish (true) or Bearish (false)
- **Metadata**: JSON with additional info (usernames, IDs, etc.)
- **Attestation Details**: Twitter account ID and service
- **Timestamp**: When created (block timestamp)
- **Archived**: Soft delete flag

### Key Features

✅ **Case-Insensitive Queries**: Search by project name regardless of case  
✅ **Batch Operations**: Fetch multiple signals efficiently  
✅ **Sentiment Analytics**: Get bullish/bearish counts per project  
✅ **Soft Delete**: Archive signals without losing data  
✅ **Event Logging**: Index signals via events  
✅ **Author Control**: Only signal author can archive/restore  

### Gas Costs (Base Network)

- Create Signal: ~200k gas (~$0.01-0.05)
- Archive Signal: ~50k gas (~$0.002-0.01)
- Read Operations: Free

## Integration Examples

### Save to Both Database and Blockchain

```typescript
import { saveTestSignal } from "./utils/database.ts";
import { getSignalsContractWithSigner, createSignalOnchain } from "./utils/onchain-signals.ts";

// Save to database (fast, for UI)
await saveTestSignal(signal);

// Save onchain (permanent, verifiable)
const contract = getSignalsContractWithSigner(privateKey);
const result = await createSignalOnchain(contract, {
  subject: signal.projectHandle,
  tweetUrl: signal.tweetUrl,
  tweetContent: signal.tweetContent || "",
  isBullish: signal.sentiment === "bullish",
  metadata: {
    twitterUsername: signal.twitterUsername,
    notedAt: signal.notedAt,
    // ... other metadata
  },
  twitterAccountId: signal.projectUserId?.toString() || ""
});

console.log(`Onchain ID: ${result.signalId}`);
console.log(`TX: https://basescan.org/tx/${result.txHash}`);
```

### Query Onchain Data

```typescript
import { getSignalsContract, getSignalsByProjectOnchain, getProjectSentimentOnchain } from "./utils/onchain-signals.ts";

const contract = getSignalsContract();

// Get all signals for a project
const signalIds = await getSignalsByProjectOnchain(contract, "ethereum");
const signals = await getSignalsBatchOnchain(contract, signalIds);

// Get sentiment stats
const { bullishCount, bearishCount } = await getProjectSentimentOnchain(contract, "ethereum");
```

### API Integration

New endpoint at `/api/signals/onchain`:

```typescript
// Create signal (POST)
fetch('/api/signals/onchain', {
  method: 'POST',
  body: JSON.stringify({
    signal: { /* TestSignal object */ },
    walletPrivateKey: 'optional_for_onchain_storage'
  })
});

// Query signals (GET)
fetch('/api/signals/onchain?project=ethereum')
fetch('/api/signals/onchain?project=ethereum&action=sentiment')
```

## Why Onchain Storage?

### Benefits

1. **Immutable History**: Signals can't be modified or deleted
2. **Transparent**: Anyone can verify signal authenticity
3. **Decentralized**: No single point of failure
4. **Composable**: Other contracts/dapps can read your signals
5. **Provenance**: Cryptographically verify who created each signal
6. **Reputation**: Build trustless reputation systems

### Trade-offs

- **Cost**: ~$0.01-0.05 per signal on Base
- **Speed**: ~2 seconds for confirmation vs instant database
- **Flexibility**: Can't edit signals after creation (by design)
- **Complexity**: Need wallet management, gas, etc.

## Architecture

### Hybrid Approach (Recommended)

```
User creates signal
       ↓
┌──────────────┐
│   Database   │ ← Fast queries, UI rendering
└──────────────┘
       ↓
┌──────────────┐
│  Blockchain  │ ← Permanent record, verification
└──────────────┘
```

**Database**: For fast reads, UI, search, filtering  
**Blockchain**: For permanence, verification, trustless reputation

### Read Pattern

```
User views signals
       ↓
Try database first (fast)
       ↓
Optional: Verify against blockchain
       ↓
Show in UI
```

## Contract Methods

### Write Methods (Require Gas)

```solidity
createSignal(subject, tweetUrl, tweetContent, isBullish, metadata, account, service)
archiveSignal(signalId)
restoreSignal(signalId)
```

### Read Methods (Free)

```solidity
getSignal(signalId) → Signal
getSignalsByAuthor(address) → uint256[]
getSignalsByProject(subject) → uint256[]
getSignalsBatch(uint256[]) → Signal[]
getProjectSentiment(subject) → (bullishCount, bearishCount)
signalCount() → uint256
```

## Events

Listen to these events for indexing:

```solidity
event SignalCreated(signalId, author, subject, isBullish, tweetUrl, timestamp)
event SignalArchived(signalId, author)
event SignalRestored(signalId, author)
```

## Security

- ✅ Only signal author can archive/restore
- ✅ Signals are immutable (can't edit)
- ✅ All data is public on blockchain
- ✅ No admin privileges or upgradability
- ✅ No external dependencies

## Comparison with Ethos

| Feature | Ethos Reviews | This Contract |
|---------|---------------|---------------|
| Subject | `address` | `string` (project handle) |
| Rating | `uint8 score` | `bool isBullish` |
| Archive | ❌ | ✅ Soft delete |
| Case-insensitive | ❌ | ✅ Yes |
| Payment token | ✅ | ❌ Not needed |

## Future Ideas

- 🔮 Reputation scoring based on signal accuracy
- 🔮 Time-locked signals (reveal later)
- 🔮 NFT badges for top performers
- 🔮 Cross-chain deployment (Ethereum, Optimism, etc.)
- 🔮 Signal staking (skin in the game)
- 🔮 DAO governance for verified projects

## Troubleshooting

### Contract not verified on BaseScan

Re-verify manually:
```bash
forge verify-contract \
  --chain-id 8453 \
  --compiler-version v0.8.20 \
  YOUR_CONTRACT_ADDRESS \
  contracts/SignalsAttestation.sol:SignalsAttestation \
  --etherscan-api-key $BASESCAN_API_KEY
```

### RPC errors

Try alternative Base RPC URLs:
- https://mainnet.base.org
- https://base.llamarpc.com
- https://base-mainnet.public.blastapi.io

### Gas estimation failing

Manually set gas limit:
```typescript
const tx = await contract.createSignal(..., { gasLimit: 250000 });
```

## Resources

- [Base Network Docs](https://docs.base.org/)
- [BaseScan](https://basescan.org/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Ethers.js Docs](https://docs.ethers.org/)
- [Main Documentation](../ONCHAIN_SIGNALS.md)

## Support

Questions? Check:
1. Main docs: `ONCHAIN_SIGNALS.md`
2. Contract code: `SignalsAttestation.sol`
3. TypeScript utils: `../utils/onchain-signals.ts`
4. Example scripts: `../scripts/*-contract-*.ts`

