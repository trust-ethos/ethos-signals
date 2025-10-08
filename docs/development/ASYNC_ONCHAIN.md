# Async Onchain Signal Saving

## Overview
Signals are now saved with **instant response** - users don't wait for blockchain confirmation!

## How It Works

### Before (Slow) ❌
```
User saves signal
  ↓
Save to database
  ↓
Wait for blockchain (5-10 seconds) ⏳
  ↓
Return response
  ↓
User can continue
```
**Total time: 5-10 seconds**

### After (Fast) ✅
```
User saves signal
  ↓
Save to database
  ↓
Return response immediately
  ↓
User can continue ⚡️

(Background: Save to blockchain + update DB)
```
**Total time: < 1 second**

## Technical Implementation

### API Flow
1. **Immediate Database Save**
   - Signal saved to PostgreSQL instantly
   - Returns success to user immediately

2. **Background Blockchain Save** (Fire-and-forget)
   - Async IIFE runs in background
   - Saves signal to Base mainnet contract
   - Updates database with transaction hash
   - No user waiting!

3. **Graceful Failure Handling**
   - If blockchain save fails, signal still exists in database
   - "View Onchain" link won't appear until blockchain confirms
   - Server logs any failures for monitoring

### Response Format

**Immediate Response:**
```json
{
  "ok": true,
  "id": "01K6GTXR...",
  "onchain": "pending"
}
```

**After Background Processing** (database automatically updated):
- `onchain_tx_hash`: Transaction hash on Base
- `onchain_signal_id`: ID in SignalsAttestation contract
- "View Onchain" link appears in UI

## Benefits

1. **⚡️ Instant UX**: User doesn't wait for blockchain (5-10x faster)
2. **🔄 Reliable**: Signal always saved even if blockchain fails
3. **📊 Transparent**: Onchain data appears automatically when ready
4. **💰 Cost-effective**: No wasted gas on failed transactions
5. **🎯 Flexible**: Easy to disable onchain saves if needed

## Monitoring

Check server logs for onchain save status:

```bash
# Success
✅ Signal 01K6GTXR saved onchain with ID: 123, TX: 0x...
✅ Database updated with onchain data for signal 01K6GTXR

# Failure (signal still exists, just not onchain)
❌ Failed to save signal 01K6GTXR onchain: insufficient funds
```

## Configuration

Enable/disable onchain saves:

```bash
# .env
ENABLE_ONCHAIN_SIGNALS=true  # Enable background onchain saves
PRIVATE_KEY=0x...            # Wallet with ETH on Base
BASE_RPC_URL=https://mainnet.base.org
SIGNALS_CONTRACT_ADDRESS=0x1e8feced8227c6b85535669ebcea967fb259a87b
```

## Trade-offs

### Pros
- ⚡️ Much faster user experience
- 🔄 More reliable (DB always updated)
- 💪 Better error handling

### Cons
- 🔍 Onchain data appears ~5-10 seconds after save (not instant)
- 📊 Requires monitoring server logs for blockchain failures
- 🎯 Can't immediately show transaction hash to user

## Best Practices

1. **Monitor server logs** for blockchain save failures
2. **Check wallet balance** regularly (for gas)
3. **Test locally** with testnet first
4. **Use database** as source of truth, blockchain as enhancement

---

**Result**: Users can save signals rapidly without blockchain delays! 🚀

