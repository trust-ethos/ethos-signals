# Security Fixes Applied

## Date: October 6, 2025

## Summary
Fixed critical security vulnerability: The system now requires authentication for all signal creation and properly tracks who saved each signal via cryptographically verified auth tokens.

---

## 🔒 The Real Security Issue

### What Was Wrong:
The `/api/signals/onchain.ts` endpoint had **NO authentication requirement**. Anyone could save signals without proving their identity.

### What Was NOT Wrong:
Users saving signals **about** other Twitter users. This is by design:
- ✅ User A can save "User B posted bullish on Bitcoin" 
- ✅ The `twitterUsername` field = the Twitter user who posted the signal (can be anyone)
- ✅ The `savedBy` field = the authenticated user who saved it (verified via auth token)

### The Distinction:
- **Signal Author** (`twitterUsername`): The Twitter user whose tweet/signal is being tracked (can be anyone)
- **Signal Saver** (`savedBy`): The authenticated user who saved this signal (must be verified)

Example:
```
Signal: {
  twitterUsername: "elonmusk",  // The person who posted the tweet
  projectHandle: "Bitcoin",
  sentiment: "bullish",
  savedBy: {
    walletAddress: "0x123...",   // ErosAgent's wallet
    ethosUsername: "erosAgent",  // ErosAgent's Ethos profile
  }
}
```
This means: "ErosAgent saved a signal that Elon Musk posted about Bitcoin being bullish"

---

## 🔐 How Auth Token Security Works

### 1. Token Creation (Cryptographically Secure)
When a user connects their wallet:

```typescript
// User signs a message with their private key
const message = `Sign this message to authenticate your wallet with Signals Extension.

Wallet: ${walletAddress}
Timestamp: ${timestamp}`;

const signature = await wallet.signMessage(message);
```

**Server verifies the signature**:
```typescript
// Uses ethers.verifyMessage to cryptographically verify
const recoveredAddress = ethers.verifyMessage(message, signature);

// Only if signature is valid and matches the claimed address:
const authToken = generateSecureToken(); // 256-bit random token
// Store: authToken -> walletAddress, ethosUsername, ethosProfileId
```

### 2. Token Usage
Every API request includes: `Authorization: Bearer <authToken>`

The server:
1. Validates the token exists and is active
2. Checks expiration (90 days)
3. Retrieves the verified wallet address and Ethos profile
4. Uses this verified identity for `savedBy` information

### 3. Why This Is Secure
- **Can't forge signatures**: Requires private key to sign messages
- **Can't steal tokens easily**: 90-day expiration, can be revoked
- **Can't fake identity**: Server uses token data, not client claims
- **Complete audit trail**: Every signal tracks the auth token that created it

---

## ✅ Fixes Applied

### 1. Authentication Required on All Endpoints ✅

#### `/api/signals/[username].ts` (Line 67-83):
```typescript
// Require authentication for POST
const auth = await getAuthFromRequest(req);
if (!auth) {
  return new Response(
    JSON.stringify({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      message: 'Please connect your wallet in the extension to save signals.'
    }),
    { status: 401 }
  );
}

// NOTE: username is the Twitter user who posted the signal (can be anyone)
// The auth token tracks WHO saved it (stored in savedBy via auth_token relationship)
```

#### `/api/signals/onchain.ts` (Line 22-46):
```typescript
// SECURITY: Require authentication for all signal creation
const auth = await getAuthFromRequest(req);
if (!auth) {
  return new Response(
    JSON.stringify({ 
      error: "Authentication required",
      code: "AUTH_REQUIRED",
      message: "Please connect your wallet to save signals."
    }),
    { status: 401 }
  );
}

// NOTE: signal.twitterUsername is the Twitter user who posted the signal (can be anyone)
// The auth token tracks WHO saved it (stored in savedBy via auth_token relationship)
```

### 2. Auth Token Tracking ✅

Every signal now stores the auth token:
```typescript
const testSignal: TestSignal = {
  // ... other fields ...
  authToken: auth.authToken, // SECURITY: Track which auth token created this signal
};
```

This creates an audit trail linking signals to verified wallet addresses.

### 3. Verified Identity in Onchain Metadata ✅

When saving onchain, uses authenticated user's verified data:
```typescript
metadata: {
  dateTimeOfPost: testSignal.tweetTimestamp,
  dateTimeOfSave: new Date().toISOString(),
  savedByHandle: auth.ethosUsername, // SECURITY: Use authenticated user's data
  savedByProfileId: auth.ethosProfileId, // SECURITY: Use authenticated user's data
},
```

Cannot be forged because it comes from the cryptographically verified auth token.

---

## 🛡️ What's Secure Now

### ✅ Authentication & Authorization:
1. **All signal creation requires authentication** - No anonymous saves
2. **Cryptographic signature verification** - Can't fake wallet ownership
3. **Token-based auth** - Secure, revocable, time-limited
4. **Complete audit trail** - Know exactly who saved what

### ✅ Identity Verification:
1. **Wallet signatures verified** - Uses ethers.verifyMessage
2. **savedBy data comes from auth token** - Can't be spoofed
3. **Onchain metadata uses verified identity** - Immutable on blockchain
4. **Rate limiting per auth token** - Prevents abuse

### ✅ Attack Mitigation:
1. **Signature timestamps expire** (5 minutes) - Prevents replay attacks
2. **Tokens expire** (90 days) - Limits exposure window
3. **Tokens can be revoked** - Immediate access termination
4. **Rate limiting** - 50 signals/hour per token

---

## 🚫 What Attack Scenarios Are Blocked

### ❌ Attack: Save signals without authentication
```bash
POST /api/signals/onchain
{ "signal": { ... } }

Response: 401 Unauthorized
```

### ❌ Attack: Forge auth token
- **Blocked**: Tokens are 256-bit random values, impossible to guess
- **Blocked**: Must have valid signature from wallet private key

### ❌ Attack: Use stolen token indefinitely
- **Blocked**: 90-day expiration
- **Blocked**: Can be revoked by user
- **Blocked**: Rate limited

### ❌ Attack: Fake savedBy information
- **Blocked**: Server uses auth token data, ignores client claims
- **Blocked**: Onchain metadata uses verified identity

---

## ✅ What's Allowed (By Design)

### ✅ Save signals about any Twitter user
```bash
# ErosAgent can save a signal about Elon Musk's tweet
Authorization: Bearer <erosAgent_token>
POST /api/signals/elonmusk
{
  "sentiment": "bullish",
  "projectHandle": "Bitcoin",
  "tweetUrl": "https://x.com/elonmusk/123",
  "notedAt": "2025-10-06"
}

Response: 201 Created
Signal saved with:
  - twitterUsername: "elonmusk" (the author of the tweet)
  - savedBy: { walletAddress: "0x...", ethosUsername: "erosAgent" }
```

This is the **core functionality** - tracking other users' trading signals.

---

## 📊 Database Security Model

### Signals Table:
```sql
signals (
  id TEXT PRIMARY KEY,
  twitter_username TEXT NOT NULL,  -- Who posted the tweet
  auth_token TEXT,                 -- Who saved it (FK to extension_auth_tokens)
  -- ... other fields
)
```

### Extension Auth Tokens Table:
```sql
extension_auth_tokens (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,     -- Verified via signature
  ethos_username TEXT,              -- Verified via Ethos API
  ethos_profile_id INTEGER,         -- Verified via Ethos API
  auth_token TEXT UNIQUE NOT NULL,  -- 256-bit random
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,           -- 90 days
  is_active BOOLEAN                 -- Can be revoked
)
```

### Query for "Who Saved This Signal":
```sql
SELECT 
  s.*,
  eat.wallet_address as saved_by_wallet,
  eat.ethos_username as saved_by_ethos_username,
  eat.ethos_profile_id as saved_by_ethos_profile_id
FROM signals s
LEFT JOIN extension_auth_tokens eat ON s.auth_token = eat.auth_token
```

---

## 🔍 Testing the Security

### Test 1: Cannot save without authentication ✅
```bash
# No auth header
POST /api/signals/onchain
{ "signal": {...} }

Expected: 401 Unauthorized
Actual: ✅ 401 Unauthorized
```

### Test 2: Can save signals about other users ✅
```bash
# Authenticated as erosAgent
Authorization: Bearer <valid_token>
POST /api/signals/elonmusk
{ 
  "sentiment": "bullish",
  "projectHandle": "Bitcoin",
  "tweetUrl": "https://x.com/elonmusk/123",
  "notedAt": "2025-10-06"
}

Expected: 201 Created with savedBy = erosAgent
Actual: ✅ Works correctly
```

### Test 3: savedBy uses auth token, not client claims ✅
```bash
# Even if client tries to fake savedBy, server uses auth token data
Authorization: Bearer <erosAgent_token>
POST /api/signals/onchain
{
  "signal": {
    "twitterUsername": "elonmusk",
    "savedBy": { "ethosUsername": "someoneElse" } // Ignored by server
  }
}

Expected: Signal saved with savedBy = erosAgent (from auth token)
Actual: ✅ Server uses auth token data
```

---

## 🎯 Summary

### Before Fixes:
- ❌ Could save signals without authentication
- ❌ No way to verify who actually saved signals
- ❌ No audit trail

### After Fixes:
- ✅ All signal creation requires authentication
- ✅ savedBy information comes from cryptographically verified auth tokens
- ✅ Complete audit trail via auth_token field
- ✅ Can save signals about any Twitter user (by design)
- ✅ Cannot forge or fake the identity of who saved it

### Security Model:
- **Signal Author** (`twitterUsername`): Flexible, can be anyone
- **Signal Saver** (`savedBy`): Strictly verified via cryptographic signatures
- **Auth Tokens**: Secure random, time-limited, revocable, rate-limited
- **Audit Trail**: Every signal links to verified wallet address

---

## ✅ Sign-off

**Status**: Security fixes correctly implemented
**Risk Level**: Low
**Breaking Changes**: None for valid use cases
**Ready for deployment**: ✅ Yes
