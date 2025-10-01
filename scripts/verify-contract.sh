#!/bin/bash

# Verify SignalsAttestation contract on BaseScan
# Usage: ./scripts/verify-contract.sh

# Load environment variables
set -a
source .env
set +a

# Check if contract address is set
if [ -z "$SIGNALS_CONTRACT_ADDRESS" ]; then
    echo "❌ SIGNALS_CONTRACT_ADDRESS not set in .env"
    exit 1
fi

# Check if API key is set
if [ -z "$BASESCAN_API_KEY" ]; then
    echo "❌ BASESCAN_API_KEY not set in .env"
    echo "Get one at: https://basescan.org/myapikey"
    exit 1
fi

# Determine chain ID based on RPC URL
if [[ "$BASE_RPC_URL" == *"sepolia"* ]]; then
    CHAIN_ID=84532
    NETWORK="Base Sepolia (testnet)"
else
    CHAIN_ID=8453
    NETWORK="Base Mainnet"
fi

echo "🔍 Verifying Contract on $NETWORK"
echo ""
echo "Contract: $SIGNALS_CONTRACT_ADDRESS"
echo "Chain ID: $CHAIN_ID"
echo ""

# Try with Foundry first
if command -v forge &> /dev/null; then
    echo "Using Foundry forge verify-contract..."
    forge verify-contract \
      --chain-id $CHAIN_ID \
      --compiler-version v0.8.20+commit.a1b79de6 \
      --watch \
      $SIGNALS_CONTRACT_ADDRESS \
      contracts/SignalsAttestation.sol:SignalsAttestation \
      --etherscan-api-key $BASESCAN_API_KEY
else
    echo "❌ Foundry not installed"
    echo ""
    echo "Install Foundry:"
    echo "  curl -L https://foundry.paradigm.xyz | bash"
    echo "  foundryup"
    echo ""
    echo "Or verify manually at:"
    if [ $CHAIN_ID -eq 84532 ]; then
        echo "  https://sepolia.basescan.org/verifyContract"
    else
        echo "  https://basescan.org/verifyContract"
    fi
    exit 1
fi

