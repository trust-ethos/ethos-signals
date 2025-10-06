# Extension Authentication System

This document describes the wallet-based authentication system for the Signals Chrome Extension.

## Overview

The authentication system allows users to connect their Ethereum wallet (MetaMask or compatible) to the extension, linking their signals to their Ethos Network profile. This provides:

- **User Identification**: All signals are linked to a wallet address and optionally an Ethos profile
- **API Protection**: Endpoints require authentication tokens
- **Rate Limiting**: Prevents abuse with configurable rate limits
- **Security**: Signature-based authentication prevents spoofing

## Architecture

### Components

1. **Database** (`migrations/004_add_extension_auth.sql`)
   - `extension_auth_tokens`: Stores authentication tokens
   - `rate_limit_tracking`: Tracks API usage per token
   - `signals.auth_token`: Links signals to auth tokens

2. **Backend** (`utils/`)
   - `extension-auth.ts`: Token management and signature verification
   - `auth-middleware.ts`: Request authentication and rate limiting
   - `routes/api/auth/`: Authentication endpoints

3. **Extension** (`extension/`)
   - `background.js`: Service worker for token management
   - `wallet-connect.js`: Wallet connection and signing
   - `popup.js`: Authentication UI
   - `content.js`: Includes auth tokens in API requests

## Authentication Flow

### 1. Initial Setup

When a user first installs the extension:

1. User clicks "Connect Wallet" in the extension popup
2. MetaMask (or compatible wallet) prompts for connection
3. User approves connection

### 2. Signature Verification

1. Extension creates a message with wallet address and timestamp
2. User signs the message with their wallet
3. Extension sends wallet address, signature, and timestamp to `/api/auth/connect`
4. Backend verifies the signature using ethers.js
5. Backend checks if wallet is linked to an Ethos profile
6. Backend creates an auth token (valid for 90 days)
7. Extension stores the auth token locally

### 3. Making Authenticated Requests

When saving a signal:

1. Extension retrieves auth token from storage
2. Adds `Authorization: Bearer <token>` header to API request
3. Backend validates token and checks rate limits
4. If valid, processes the request
5. Signal is saved with associated auth token

## API Endpoints

### Authentication

#### POST `/api/auth/connect`

Authenticate a wallet and create an auth token.

**Request:**
```json
{
  "walletAddress": "0x...",
  "signature": "0x...",
  "timestamp": 1234567890,
  "ethosProfileId": 123,
  "ethosUsername": "username",
  "deviceIdentifier": "ext-..."
}
```

**Response:**
```json
{
  "success": true,
  "authToken": "...",
  "walletAddress": "0x...",
  "ethosProfileId": 123,
  "ethosUsername": "username",
  "expiresAt": 1234567890
}
```

#### GET `/api/auth/verify`

Verify an auth token is valid.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "walletAddress": "0x...",
  "ethosProfileId": 123,
  "ethosUsername": "username",
  "expiresAt": 1234567890
}
```

#### POST `/api/auth/revoke`

Revoke an auth token (logout).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Token revoked successfully"
}
```

### Protected Endpoints

All signal creation and deletion endpoints now require authentication:

- `POST /api/signals/{username}` - Create signal (requires auth)
- `DELETE /api/signals/{username}` - Delete signal (requires auth)
- `GET /api/signals/{username}` - List signals (optional auth, rate limited if authenticated)

## Rate Limits

Default rate limits per authenticated token:

- **Signal Creation**: 50 requests per hour
- **Signal List**: 100 requests per hour
- **Default**: 200 requests per hour

Rate limit responses include headers:
```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 49
X-RateLimit-Reset: 2024-01-01T12:00:00Z
Retry-After: 3600
```

## Setup Instructions

### 1. Database Migration

Run the migration to create auth tables:

```bash
# Using your database client
psql -d your_database -f migrations/004_add_extension_auth.sql
```

### 2. Backend Dependencies

The backend uses ethers.js for signature verification (imported via npm):

```typescript
// Already included in extension-auth.ts
const { ethers } = await import("npm:ethers@6.11.1");
```

### 3. Extension Installation

#### For Development:

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` directory
5. Extension should appear with "Connect Wallet" button

#### For Production:

1. Build extension: `./bundle-extension.sh` (if you have a build script)
2. Upload to Chrome Web Store

### 4. User Setup

1. User installs extension
2. User clicks extension icon in toolbar
3. User clicks "Connect Wallet"
4. User approves wallet connection in MetaMask
5. User signs authentication message
6. Extension shows "Connected" status

## Security Considerations

### Token Security

- Tokens are stored in Chrome's local storage (encrypted at rest by Chrome)
- Tokens expire after 90 days
- Tokens can be revoked by user or backend
- Tokens are validated on every request

### Signature Verification

- Messages include timestamp (5 minute expiration)
- Messages include wallet address
- Signatures are verified using ethers.js
- Only valid signatures create tokens

### Rate Limiting

- Prevents spam and abuse
- Per-token limits prevent one user from exhausting resources
- Failed requests don't count against limits
- Limits are configurable in `extension-auth.ts`

## Monitoring

### Token Activity

Query active tokens:
```sql
SELECT 
  wallet_address,
  ethos_username,
  created_at,
  last_used_at,
  is_active
FROM extension_auth_tokens
WHERE is_active = TRUE
ORDER BY last_used_at DESC;
```

### Rate Limit Usage

Query rate limit stats:
```sql
SELECT 
  eat.wallet_address,
  eat.ethos_username,
  rlt.endpoint,
  rlt.request_count,
  rlt.window_start
FROM rate_limit_tracking rlt
JOIN extension_auth_tokens eat ON rlt.auth_token = eat.auth_token
WHERE rlt.window_start > NOW() - INTERVAL '1 hour'
ORDER BY rlt.request_count DESC;
```

### Signal Attribution

Query signals by auth token:
```sql
SELECT 
  s.twitter_username,
  s.project_handle,
  s.sentiment,
  eat.wallet_address,
  eat.ethos_username,
  s.created_at
FROM signals s
JOIN extension_auth_tokens eat ON s.auth_token = eat.auth_token
WHERE eat.wallet_address = '0x...'
ORDER BY s.created_at DESC;
```

## Maintenance

### Cleanup Old Tokens

Expired tokens are automatically deactivated, but can be cleaned up:

```typescript
import { cleanupExpiredAuth } from "./utils/extension-auth.ts";

// Run periodically (e.g., daily cron job)
await cleanupExpiredAuth();
```

### Revoke Token Manually

```typescript
import { revokeAuthToken } from "./utils/extension-auth.ts";

await revokeAuthToken("<auth-token>");
```

## Troubleshooting

### User Can't Connect Wallet

1. Check if MetaMask is installed
2. Check if wallet is unlocked
3. Check browser console for errors
4. Verify API endpoints are accessible

### Authentication Fails

1. Check signature verification in backend logs
2. Verify timestamp is recent (< 5 minutes)
3. Check wallet address format
4. Verify ethers.js is properly imported

### Rate Limit Issues

1. Check rate limit configuration in `extension-auth.ts`
2. Review rate limit tracking table
3. Consider increasing limits for power users
4. Check for potential abuse patterns

## Future Enhancements

Potential improvements to the authentication system:

1. **Multi-wallet Support**: Allow users to link multiple wallets
2. **Session Management**: Show all active sessions in popup
3. **Granular Permissions**: Different access levels for different operations
4. **Usage Analytics**: Dashboard showing API usage per user
5. **Token Refresh**: Automatic token refresh before expiration
6. **2FA**: Optional two-factor authentication for sensitive operations

## Support

For issues or questions:

1. Check extension console logs
2. Check backend server logs
3. Review this documentation
4. Contact development team

