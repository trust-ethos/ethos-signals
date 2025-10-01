# Onchain Signals - Smart Contract Documentation

This document explains how to use the SignalsAttestation smart contract to store trading signals onchain.

## Overview

The `SignalsAttestation` contract allows users to store crypto trading signals directly on the blockchain. It's modeled after the Ethos review contract pattern and stores:

- **Author**: The Ethereum address of who saved the signal
- **Subject**: The project handle or identifier (e.g., "ethereum", "maker")
- **Tweet URL**: Source URL of the signal
- **Tweet Content**: The actual content of the tweet
- **Sentiment**: Bullish (true) or Bearish (false)
- **Metadata**: JSON object with additional information
- **Attestation Details**: Twitter account ID and service name
- **Timestamp**: When the signal was created onchain
- **Archived**: Whether the signal has been soft-deleted

## Contract Structure

### Signal Struct

```solidity
struct Signal {
    address author;              // Who saved the signal
    string subject;              // Project handle
    string tweetUrl;             // Source URL
    string tweetContent;         // Tweet text
    bool isBullish;              // true = bullish, false = bearish
    string metadata;             // JSON metadata
    AttestationDetails attestationDetails;
    uint256 timestamp;           // Block timestamp
    bool archived;               // Soft delete flag
}
```

### Metadata Format

The metadata field should contain a JSON string with:

```json
{
  "projectUserId": 123456,
  "projectDisplayName": "Ethereum",
  "projectAvatarUrl": "https://...",
  "verifiedProjectId": "abc123",
  "notedAt": "2025-10-01",
  "twitterUsername": "vitalik"
}
```

## Key Features

### 1. **Create Signals**
Store a new signal onchain with all relevant information.

### 2. **Query by Author**
Get all signals saved by a specific Ethereum address.

### 3. **Query by Project**
Get all signals about a specific project (case-insensitive).

### 4. **Batch Queries**
Fetch multiple signals in a single call for efficiency.

### 5. **Sentiment Analytics**
Get aggregated bullish/bearish counts for any project.

### 6. **Archive/Restore**
Soft delete signals without losing the onchain data.

## Usage Examples

### Reading Signals (No Gas)

```typescript
import { getSignalsContract, getSignalsByProjectOnchain } from "./utils/onchain-signals.ts";

// Get contract instance (read-only)
const contract = getSignalsContract();

// Get all signal IDs for a project
const signalIds = await getSignalsByProjectOnchain(contract, "ethereum");

// Get signal details
const signals = await getSignalsBatchOnchain(contract, signalIds);

// Get sentiment stats
const sentiment = await getProjectSentimentOnchain(contract, "ethereum");
console.log(`Bullish: ${sentiment.bullishCount}, Bearish: ${sentiment.bearishCount}`);
```

### Creating Signals (Requires Gas)

```typescript
import { getSignalsContractWithSigner, createSignalOnchain } from "./utils/onchain-signals.ts";

// Get contract with signer (for writing)
const privateKey = Deno.env.get("PRIVATE_KEY")!;
const contract = getSignalsContractWithSigner(privateKey);

// Create a signal
const result = await createSignalOnchain(contract, {
  subject: "ethereum",
  tweetUrl: "https://x.com/user/status/123",
  tweetContent: "Ethereum is looking bullish for Q4!",
  isBullish: true,
  metadata: {
    twitterUsername: "vitalik",
    notedAt: "2025-10-01",
    projectDisplayName: "Ethereum",
    projectUserId: 123456
  },
  twitterAccountId: "123456789"
});

console.log(`Signal created with ID: ${result.signalId}`);
console.log(`Transaction: ${result.txHash}`);
```

## Deployment

### Prerequisites

1. Install [Foundry](https://book.getfoundry.sh/getting-started/installation) for Solidity development
2. Set up environment variables:
   - `PRIVATE_KEY`: Deployer private key
   - `BASE_RPC_URL`: Base network RPC URL
   - `BASESCAN_API_KEY`: For contract verification

### Deploy to Base

```bash
# Install dependencies
forge install

# Compile contract
forge build

# Deploy to Base
forge create \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --etherscan-api-key $BASESCAN_API_KEY \
  --verify \
  contracts/SignalsAttestation.sol:SignalsAttestation

# Update .env with contract address
echo "SIGNALS_CONTRACT_ADDRESS=0x..." >> .env
```

### Deploy to Base Sepolia (Testnet)

```bash
forge create \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --etherscan-api-key $BASESCAN_API_KEY \
  --verify \
  contracts/SignalsAttestation.sol:SignalsAttestation
```

## Integration with Existing System

### Hybrid Approach

You can use both the PostgreSQL database and onchain storage:

1. **Save to Database** (fast, for UI)
2. **Save to Blockchain** (permanent, verifiable)

```typescript
import { saveTestSignal } from "./utils/database.ts";
import { getSignalsContractWithSigner, createSignalOnchain } from "./utils/onchain-signals.ts";

async function saveSignalEverywhere(signal: TestSignal, privateKey: string) {
  // Save to database for fast queries
  await saveTestSignal(signal);
  
  // Also save onchain for permanence
  const contract = getSignalsContractWithSigner(privateKey);
  const result = await createSignalOnchain(contract, {
    subject: signal.projectHandle,
    tweetUrl: signal.tweetUrl,
    tweetContent: signal.tweetContent || "",
    isBullish: signal.sentiment === "bullish",
    metadata: {
      twitterUsername: signal.twitterUsername,
      notedAt: signal.notedAt,
      projectDisplayName: signal.projectDisplayName,
      projectUserId: signal.projectUserId,
      projectAvatarUrl: signal.projectAvatarUrl,
      verifiedProjectId: signal.verifiedProjectId
    },
    twitterAccountId: signal.projectUserId?.toString() || ""
  });
  
  console.log(`Saved onchain with ID: ${result.signalId}`);
}
```

## Events

The contract emits events for indexing and monitoring:

### SignalCreated
```solidity
event SignalCreated(
    uint256 indexed signalId,
    address indexed author,
    string subject,
    bool isBullish,
    string tweetUrl,
    uint256 timestamp
);
```

### SignalArchived
```solidity
event SignalArchived(
    uint256 indexed signalId,
    address indexed author
);
```

### SignalRestored
```solidity
event SignalRestored(
    uint256 indexed signalId,
    address indexed author
);
```

## Gas Estimates

Approximate gas costs on Base (with ~1 Gwei gas price):

- **Create Signal**: ~200,000 gas (~$0.01-0.05)
- **Archive Signal**: ~50,000 gas (~$0.002-0.01)
- **Read Operations**: Free (no gas)

## Security Considerations

1. **Author Verification**: Only the signal author can archive/restore their signals
2. **Immutable Data**: Once created, signal data cannot be modified (only archived)
3. **Public Data**: All signals are publicly readable on the blockchain
4. **Case-Insensitive**: Project handles are stored case-insensitively for consistent queries

## Comparison with Ethos Review Contract

| Feature | Ethos Reviews | Signals Attestation |
|---------|--------------|---------------------|
| Subject Type | `address` | `string` (project handle) |
| Rating | `uint8 score` | `bool isBullish` |
| Payment | `paymentToken` support | No payment needed |
| Archive | Not built-in | Soft delete with restore |
| Query by Subject | Yes | Yes |
| Attestation Details | Yes | Yes (Twitter account) |

## Future Enhancements

Potential improvements to consider:

1. **Reputation System**: Weight signals based on author's track record
2. **Time-locked Signals**: Reveal signals after a certain date
3. **NFT Integration**: Mint NFTs for particularly accurate signals
4. **Multi-chain Support**: Deploy to other chains (Ethereum, Optimism, etc.)
5. **Signal Updates**: Allow editing within a time window
6. **Staking**: Require staking to create signals (anti-spam)

## Support

For questions or issues:
- Review the smart contract code: `contracts/SignalsAttestation.sol`
- Check TypeScript utilities: `utils/onchain-signals.ts`
- See example integration in your existing routes


