#!/bin/bash

# Simple curl-based verification for mainnet
# Run this IMMEDIATELY after deploying

source .env

echo "🔍 Verifying Contract on Base Mainnet"
echo ""
echo "Contract: $SIGNALS_CONTRACT_ADDRESS"
echo ""

# Read contract source
CONTRACT_SOURCE=$(cat contracts/SignalsAttestation.sol)

# Verify using curl with form data
curl -d "module=contract" \
     -d "action=verifysourcecode" \
     -d "contractaddress=$SIGNALS_CONTRACT_ADDRESS" \
     -d "sourceCode=$CONTRACT_SOURCE" \
     -d "codeformat=solidity-single-file" \
     -d "contractname=SignalsAttestation" \
     -d "compilerversion=v0.8.20+commit.a1b79de6" \
     -d "optimizationUsed=1" \
     -d "runs=200" \
     -d "constructorArguements=" \
     -d "licenseType=3" \
     -d "apikey=$BASESCAN_API_KEY" \
     "https://api.basescan.org/api"

echo ""
echo ""
echo "Check status at: https://basescan.org/address/$SIGNALS_CONTRACT_ADDRESS#code"

