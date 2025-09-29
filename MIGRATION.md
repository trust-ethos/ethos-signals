# Migration from Deno KV to Neon DB

This guide walks through migrating the Signals app from Deno KV to Neon PostgreSQL database.

## ✅ What's Been Migrated

### Database Setup
- ✅ PostgreSQL connection pool using `deno.land/x/postgres`
- ✅ Database schema for signals, verified projects, and price cache
- ✅ Auto-initialization of tables on app start

### Data Models
- ✅ `TestSignal` - Trading signals with full metadata
- ✅ `VerifiedProject` - Verified projects with chain and type info  
- ✅ Price caching system for API responses

### API Functions
- ✅ All KV functions replaced with PostgreSQL equivalents
- ✅ Caching system for price data (1-24 hour TTL)
- ✅ CRUD operations for signals and projects

## 🚀 Setup Instructions

### 1. Create Neon Database
1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new database
3. Get your connection string

### 2. Configure Environment
Add to your `.env` file:
```bash
DATABASE_URL=postgresql://username:password@hostname:5432/database_name?sslmode=require
```

### 3. Run Migration
The database tables will be automatically created when you start the app:

```bash
deno task start
```

Look for: `✅ Database initialized successfully`

### 4. Data Migration (Optional)
If you have existing KV data, you can migrate it manually by:
1. Exporting data from KV
2. Using the new database functions to insert data

## 🔧 Key Changes

### Database Tables
```sql
-- Signals table
CREATE TABLE signals (
  id TEXT PRIMARY KEY,
  twitter_username TEXT NOT NULL,
  project_handle TEXT NOT NULL,
  tweet_url TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  noted_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verified projects table  
CREATE TABLE verified_projects (
  id TEXT PRIMARY KEY,
  ethos_user_id INTEGER NOT NULL UNIQUE,
  twitter_username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL,
  chain TEXT DEFAULT 'ethereum',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price cache table
CREATE TABLE price_cache (
  cache_key TEXT PRIMARY KEY,
  price DECIMAL(20, 10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
```

### Performance Improvements
- ✅ **Better Indexing**: Database indexes on key lookup fields
- ✅ **Connection Pooling**: Efficient database connections
- ✅ **Smart Caching**: Configurable TTL for different data types
- ✅ **Query Optimization**: Optimized SQL queries with proper joins

### Benefits
- 🎯 **Scalability**: Handle thousands of concurrent users
- 💾 **Persistence**: Data survives deployments and restarts
- 🔍 **Advanced Queries**: Complex filtering and aggregation
- 📊 **Analytics**: Easy to add reporting and analytics
- 🔄 **Backup/Restore**: Built-in database backup capabilities

## 🧪 Testing

All existing functionality should work identically:
- ✅ Creating and viewing signals
- ✅ Managing verified projects  
- ✅ Price caching for NFT/token data
- ✅ Chrome extension integration
- ✅ Admin panel functionality

## 🔥 Clean Up ✅ COMPLETED

~~After confirming everything works, you can remove:~~
- ✅ `utils/kv.ts` (old KV functions) - **REMOVED**
- ✅ Any `--unstable-kv` flags - **REMOVED** 
- ✅ KV-related imports - **UPDATED**
- ✅ Admin route fixed to use new database functions

**The migration is 100% complete!** 🎉

All functionality has been successfully migrated:
- ✅ Profile pages with signals
- ✅ Admin panel for verified projects  
- ✅ Price caching system
- ✅ Chrome extension integration
- ✅ Database connection management
