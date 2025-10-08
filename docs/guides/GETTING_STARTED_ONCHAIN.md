# Getting Started with Onchain Signals

You now have a complete smart contract system for storing signals onchain! 🎉

## What Was Created

### 📁 Smart Contract Files

1. **`contracts/SignalsAttestation.sol`**
   - Main Solidity smart contract
   - Stores signals permanently onchain
   - Modeled after Ethos' review contract

2. **`contracts/SignalsAttestation.abi.json`**
   - Contract ABI for TypeScript integration
   - Used by ethers.js to interact with contract

3. **`contracts/README.md`**
   - Complete documentation for the contract
   - Usage examples and troubleshooting

### 🛠️ TypeScript Utilities

4. **`utils/onchain-signals.ts`**
   - Helper functions to interact with the contract
   - Read signals (free)
   - Write signals (costs gas)

### 🌐 API Integration

5. **`routes/api/signals/onchain.ts`**
   - New API endpoint: `/api/signals/onchain`
   - Combines database + blockchain storage
   - Query onchain signals via REST API

### 📜 Scripts

6. **`scripts/deploy-signals-contract.ts`**
   - Helper to generate deployment commands
   - Validates your environment setup

7. **`scripts/test-contract-read.ts`**
   - Test reading from deployed contract
   - Verify deployment worked

8. **`scripts/create-test-signal.ts`**
   - Create a test signal onchain
   - Example of writing to contract

### 📚 Documentation

9. **`ONCHAIN_SIGNALS.md`**
   - Comprehensive guide to the system
   - Deployment instructions
   - Integration patterns

10. **`foundry.toml`**
    - Foundry configuration for deployment
    - Optimized for Base network

11. **Updated `env.example`**
    - Added required environment variables

## Quick Setup (5 Minutes)

### Step 1: Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Step 2: Add Environment Variables

Add to your `.env`:

```bash
# For deployment and writing
PRIVATE_KEY=0x_your_private_key
BASE_RPC_URL=https://mainnet.base.org
BASESCAN_API_KEY=your_api_key

# Will be set after deployment
SIGNALS_CONTRACT_ADDRESS=0x_deployed_address
```

### Step 3: Deploy Contract

**Option A: Using Foundry directly**

For testnet (Base Sepolia - FREE):
```bash
forge create \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --etherscan-api-key $BASESCAN_API_KEY \
  --verify \
  contracts/SignalsAttestation.sol:SignalsAttestation
```

For mainnet (Base - costs ~$1-2):
```bash
forge create \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --etherscan-api-key $BASESCAN_API_KEY \
  --verify \
  contracts/SignalsAttestation.sol:SignalsAttestation
```

**Option B: Using helper script**
```bash
deno run --allow-env --allow-read scripts/deploy-signals-contract.ts
```

### Step 4: Update .env

After deployment, add the contract address:
```bash
SIGNALS_CONTRACT_ADDRESS=0x_the_address_you_got
```

### Step 5: Test It!

```bash
# Read from contract (free)
deno run --allow-net --allow-env --allow-read scripts/test-contract-read.ts

# Create a test signal (costs gas)
deno run --allow-net --allow-env --allow-read scripts/create-test-signal.ts
```

## How It Works

### Data Flow

```
┌─────────────────┐
│  User Creates   │
│     Signal      │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │   Blockchain    │
│    Database     │  │   (Base L2)     │
│                 │  │                 │
│  • Fast reads   │  │  • Permanent    │
│  • For UI       │  │  • Verifiable   │
│  • Searchable   │  │  • Immutable    │
└─────────────────┘  └─────────────────┘
```

### What's Stored Onchain

Each signal contains:

```typescript
{
  author: "0x...",              // Wallet address
  subject: "ethereum",          // Project handle
  tweetUrl: "https://...",      // Source
  tweetContent: "...",          // Tweet text
  isBullish: true,              // Sentiment
  metadata: "{...}",            // JSON with extra data
  attestationDetails: {
    account: "123456",          // Twitter ID
    service: "x.com"
  },
  timestamp: 1696118400,        // Block timestamp
  archived: false               // Soft delete flag
}
```

## Usage Examples

### Example 1: Save Signal to Both Places

```typescript
import { saveTestSignal } from "./utils/database.ts";
import { 
  getSignalsContractWithSigner, 
  createSignalOnchain 
} from "./utils/onchain-signals.ts";

// Your signal data
const signal = {
  id: "abc123",
  twitterUsername: "vitalik",
  projectHandle: "ethereum",
  tweetUrl: "https://x.com/vitalik/status/123",
  tweetContent: "ETH is looking strong!",
  sentiment: "bullish" as const,
  notedAt: "2025-10-01",
  createdAt: Date.now()
};

// Save to database (fast)
await saveTestSignal(signal);

// Save onchain (permanent)
const privateKey = Deno.env.get("PRIVATE_KEY")!;
const contract = getSignalsContractWithSigner(privateKey);

const result = await createSignalOnchain(contract, {
  subject: signal.projectHandle,
  tweetUrl: signal.tweetUrl,
  tweetContent: signal.tweetContent,
  isBullish: signal.sentiment === "bullish",
  metadata: {
    twitterUsername: signal.twitterUsername,
    notedAt: signal.notedAt
  },
  twitterAccountId: "123456"
});

console.log(`Onchain ID: ${result.signalId}`);
console.log(`TX: https://basescan.org/tx/${result.txHash}`);
```

### Example 2: Read Signals (No Gas Cost)

```typescript
import { 
  getSignalsContract,
  getSignalsByProjectOnchain,
  getSignalsBatchOnchain,
  getProjectSentimentOnchain
} from "./utils/onchain-signals.ts";

// Get contract (read-only, no wallet needed)
const contract = getSignalsContract();

// Get all signals for a project
const signalIds = await getSignalsByProjectOnchain(contract, "ethereum");
console.log(`Found ${signalIds.length} signals for Ethereum`);

// Get signal details
const signals = await getSignalsBatchOnchain(contract, signalIds);
signals.forEach(s => {
  console.log(`${s.subject}: ${s.isBullish ? "🐂" : "🐻"}`);
});

// Get sentiment stats
const sentiment = await getProjectSentimentOnchain(contract, "ethereum");
console.log(`Bullish: ${sentiment.bullishCount}`);
console.log(`Bearish: ${sentiment.bearishCount}`);
```

### Example 3: API Integration

```typescript
// POST: Create signal
const response = await fetch('/api/signals/onchain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    signal: {
      /* your signal data */
    },
    walletPrivateKey: 'optional_for_onchain_storage'
  })
});

const result = await response.json();
// result.onchain.txHash = transaction hash
// result.onchain.signalId = onchain ID

// GET: Query signals for project
const signals = await fetch('/api/signals/onchain?project=ethereum');
const data = await signals.json();

// GET: Get sentiment
const sentiment = await fetch('/api/signals/onchain?project=ethereum&action=sentiment');
const stats = await sentiment.json();
```

## Why Use Onchain Storage?

### ✅ Benefits

1. **Immutable**: Can't be modified or censored
2. **Verifiable**: Anyone can verify authenticity
3. **Permanent**: Exists as long as blockchain exists
4. **Trustless**: No need to trust a central database
5. **Composable**: Other apps can read your signals
6. **Reputation**: Build provable track record

### ⚠️ Trade-offs

1. **Cost**: ~$0.01-0.05 per signal on Base
2. **Speed**: ~2 seconds vs instant database
3. **Can't edit**: Signals are immutable (by design)
4. **Complexity**: Need wallets, gas, etc.

### 💡 Recommended Approach: Hybrid

Use **both** database and blockchain:

- **Database**: For fast UI, search, filtering
- **Blockchain**: For permanence, verification, trust

Best of both worlds! ✨

## Cost Breakdown

### Deployment (One-time)

- **Testnet (Base Sepolia)**: FREE (test ETH)
- **Mainnet (Base)**: ~$1-2 in ETH

### Per Signal

- **Create Signal**: ~$0.01-0.05 (200k gas)
- **Archive Signal**: ~$0.002-0.01 (50k gas)
- **Read Signals**: FREE (no gas)

Base L2 is ~100x cheaper than Ethereum mainnet! 🎉

## Next Steps

### For Testing

1. Deploy to Base Sepolia testnet (free)
2. Get test ETH from [Base faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
3. Create test signals
4. Verify on [Sepolia BaseScan](https://sepolia.basescan.org/)

### For Production

1. Deploy to Base mainnet
2. Update your `.env` with contract address
3. Integrate into your signals form
4. Add UI to show onchain verification
5. Consider batching signals to save gas

### UI Enhancements

Consider adding:

- ✅ Checkmark for onchain-verified signals
- 🔗 Link to BaseScan transaction
- 📊 Onchain sentiment stats widget
- 🏆 Leaderboard based on onchain reputation

## Troubleshooting

### "Cannot find module 'ethers'"

Install ethers.js:
```bash
# Deno will auto-download on first use
# Or manually: deno cache utils/onchain-signals.ts
```

### "Transaction reverted"

- Check you have enough ETH for gas
- Verify private key is correct
- Try increasing gas limit

### "Contract not verified"

Re-verify on BaseScan:
```bash
forge verify-contract \
  --chain-id 8453 \
  --compiler-version v0.8.20 \
  YOUR_CONTRACT_ADDRESS \
  contracts/SignalsAttestation.sol:SignalsAttestation
```

## Resources

- 📖 [Main Documentation](ONCHAIN_SIGNALS.md)
- 📝 [Contract README](contracts/README.md)
- 🔗 [Base Docs](https://docs.base.org/)
- 🔍 [BaseScan](https://basescan.org/)
- 🛠️ [Foundry Book](https://book.getfoundry.sh/)

## Questions?

The contract is fully functional and ready to deploy! Here's what to do:

1. **Try testnet first** - Deploy to Base Sepolia (free)
2. **Test thoroughly** - Create/read signals
3. **Deploy to mainnet** - When ready
4. **Integrate with UI** - Show onchain badges

You have everything you need! 🚀

