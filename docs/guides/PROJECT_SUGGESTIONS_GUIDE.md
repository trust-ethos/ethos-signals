# Project Suggestions & Pre-loading Guide

This guide explains how to use the new project suggestions system and pre-load project data.

## Overview

The Signals app now supports:
1. **User-suggested projects**: Users can suggest new tokens/NFTs through the extension
2. **Admin review workflow**: Admins can approve, edit, or reject suggestions
3. **Automated pre-loading**: Scripts to import top tokens from CoinGecko, DeFi protocols from DefiLlama, and curated NFT collections

## Database Migration

First, run the database migration to add the new fields and tables:

```bash
# Connect to your database and run the migration
psql $DATABASE_URL < migrations/005_add_project_suggestions.sql
```

This adds:
- Verification tracking fields (`is_verified`, `suggested_by_auth_token`, etc.)
- Rate limiting table for suggestions (`project_suggestion_rate_limit`)

## Pre-loading Projects

### 1. Pre-load Top Tokens from CoinGecko

Fetches top 500 tokens by market cap:

```bash
deno run -A scripts/preload-coingecko-tokens.ts
```

**Requirements:**
- Optional: Set `COINGECKO_API_KEY` environment variable for higher rate limits
- Requires active database connection

**What it does:**
- Fetches top 500 tokens from CoinGecko
- Filters for tokens with Twitter profiles
- Looks up Ethos profiles for each token
- Adds contract addresses and CoinGecko IDs
- Skips tokens that already exist

**Rate limiting:**
- Free tier: ~50 requests per minute
- Pro tier (with API key): Higher limits

**Estimated time:** 15-30 minutes depending on API rate limits

### 2. Pre-load DeFi Protocols from DefiLlama

Fetches top 100 DeFi protocols by TVL:

```bash
deno run -A scripts/preload-defillama-tokens.ts
```

**What it does:**
- Fetches protocols with $10M+ TVL
- Filters for protocols with governance tokens and Twitter
- Adds protocol information and governance tokens
- Cross-references with CoinGecko IDs when available

**Estimated time:** 5-10 minutes

### 3. Pre-load Curated NFT Collections

Adds manually curated list of top NFT collections:

```bash
deno run -A scripts/preload-nft-collections.ts
```

**What it does:**
- Processes curated list of 20+ top NFT collections
- Includes BAYC, CryptoPunks, Azuki, etc.
- Adds contract addresses and collection info

**Estimated time:** 1-2 minutes

### Running All Scripts

You can run all three scripts sequentially:

```bash
# Run all pre-loading scripts
deno run -A scripts/preload-coingecko-tokens.ts && \
deno run -A scripts/preload-defillama-tokens.ts && \
deno run -A scripts/preload-nft-collections.ts
```

## User Suggestions

### How Users Suggest Projects

1. **On the Web App (https://your-domain.com/projects):**
   - Visit the Verified Projects page
   - Click on "Suggest a New Project" section at the top
   - Form expands with simplified fields:
     - **Search Project** - Typeahead search for Ethos profiles by Twitter handle
     - **Select Project** - Choose from search results (auto-populates display name and avatar)
     - **Project Type** - Token/NFT/Pre-TGE
     - **Chain** - Ethereum/Base/Solana/etc (for tokens/NFTs only)
     - **Contract Address** - Optional but recommended
     - **CoinGecko ID** - Optional (mainly for Layer 1 tokens without contracts)
   - Submit suggestion

2. **From the Chrome Extension:**
   - When saving a signal, if the project isn't found in the dropdown
   - Click "Suggest this project on our website"
   - Opens the /projects page in a new tab where they can fill out the form

3. **Rate Limits:**
   - Users can submit **5 suggestions per 24 hours**
   - Rate limit resets on a rolling 24-hour window
   - Clear error messages when limit is reached

4. **Validation:**
   - All required fields must be filled
   - Twitter handle must be valid
   - Contract address format validated by chain
   - Project must have an Ethos profile

### API Endpoint

```typescript
POST /api/projects/suggest
Authorization: Bearer <extension_auth_token>

{
  "twitterUsername": "username",
  "displayName": "Project Name",
  "avatarUrl": "https://...",
  "type": "token" | "nft" | "pre_tge",
  "chain": "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid",
  "link": "0x...", // Contract address
  "coinGeckoId": "token-id", // Optional
  "ticker": "TKN" // Optional
}
```

## Admin Review Workflow

### Accessing the Admin Panel

Navigate to: `https://your-domain.com/admin/verified`

Authentication: Basic Auth with `ADMIN_PASSWORD` environment variable

### Admin Panel Features

The admin panel now has **3 tabs**:

#### 1. Verified Projects Tab
- Shows all approved projects
- Delete option for each project
- Same as before

#### 2. Pending Suggestions Tab
- Shows all unverified project suggestions
- Displays suggester information:
  - Wallet address
  - Ethos username
  - Suggestion date
- Project details:
  - Twitter, display name, avatar
  - Type, chain, contract/CoinGecko ID
  - Ticker symbol

**Actions:**
- **Approve**: Approve suggestion as-is
- **Edit & Approve**: Modify fields before approving
  - Can change Twitter username, display name
  - Update contract address or CoinGecko ID
  - Change chain or ticker
- **Reject**: Delete the suggestion

#### 3. Add New Tab
- Manual admin-created projects
- Same form as before with auto-populate from CoinGecko

### Admin API Endpoints

**Get pending suggestions:**
```bash
GET /api/admin/projects/review
Authorization: Basic <admin_credentials>
```

**Approve/Edit a suggestion:**
```bash
PATCH /api/admin/projects/review
Authorization: Basic <admin_credentials>

{
  "projectId": "01HXXX...",
  "approve": true,
  "updates": {
    "twitterUsername": "newhandle",
    "link": "0x...",
    // ... any fields to update
  },
  "verifiedBy": "admin"
}
```

**Reject a suggestion:**
```bash
DELETE /api/admin/projects/review?id=01HXXX...
Authorization: Basic <admin_credentials>
```

## Filtering Verified Projects

The `/api/verified` endpoint now supports filtering:

```bash
# Get only verified projects (default)
GET /api/verified?status=verified

# Get only unverified suggestions
GET /api/verified?status=unverified

# Get all projects (verified + unverified)
GET /api/verified?status=all
```

The extension automatically fetches only verified projects for the dropdown.

## Database Schema

### New Fields in `verified_projects` Table

```sql
is_verified BOOLEAN DEFAULT TRUE
suggested_by_auth_token TEXT
suggested_at TIMESTAMPTZ
verified_at TIMESTAMPTZ
verified_by TEXT
```

### New Table: `project_suggestion_rate_limit`

```sql
CREATE TABLE project_suggestion_rate_limit (
  id TEXT PRIMARY KEY,
  auth_token TEXT NOT NULL,
  suggestion_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL,
  last_suggestion_at TIMESTAMPTZ NOT NULL
);
```

## Troubleshooting

### Pre-loading Scripts

**Issue: Rate limit errors from CoinGecko**
- Solution: Add `COINGECKO_API_KEY` environment variable for pro tier access
- Or: Run script later when rate limit resets

**Issue: "No Ethos profile" for many tokens**
- This is expected - not all tokens have Ethos profiles
- Script will skip these and continue with others

**Issue: Import takes too long**
- CoinGecko script has built-in rate limiting delays
- Expected to take 15-30 minutes for 500 tokens
- Can be interrupted and re-run (skips existing projects)

### User Suggestions

**Issue: Users can't submit suggestions**
- Check: User must be authenticated with extension
- Check: User may have hit 5 suggestions/day rate limit
- Check: Project must have valid Ethos profile

**Issue: Validation errors**
- Contract address format must match chain (e.g., 0x... for Ethereum)
- Twitter handle must be valid (no spaces, special chars)
- Either contract address OR CoinGecko ID required for tokens

### Admin Panel

**Issue: Can't access admin panel**
- Check: `ADMIN_PASSWORD` environment variable is set
- Use Basic Auth with any username and the admin password

**Issue: Pending suggestions not showing**
- Check: Database migration was run successfully
- Check: Users have actually submitted suggestions

## Best Practices

1. **Run pre-loading scripts during low-traffic times** to avoid impacting user experience

2. **Review suggestions regularly** to provide quick feedback to users

3. **When editing suggestions**, verify contract addresses on block explorers before approving

4. **Use "Reject" for spam** or duplicate suggestions

5. **Monitor rate limit table** to identify potential abuse:
```sql
SELECT auth_token, suggestion_count, window_start
FROM project_suggestion_rate_limit
WHERE suggestion_count >= 5
ORDER BY window_start DESC;
```

## Future Enhancements

Potential improvements to consider:

1. **Automated verification**: Use CoinGecko API to auto-verify contract addresses
2. **OpenSea integration**: Automatically fetch top NFT collections
3. **Reputation system**: Increase suggestion limits for users with good track records
4. **Bulk actions**: Approve/reject multiple suggestions at once
5. **Notification system**: Alert admins when new suggestions arrive

## Support

For issues or questions:
- Check the main README.md
- Review the security documentation in `docs/security/`
- Check the development guides in `docs/development/`

