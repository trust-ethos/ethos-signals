# Deployment Instructions - Signals v1.5.0

Quick reference guide for deploying the paid promo disclosure status feature.

---

## 🎯 Pre-Deployment Checklist

- [x] All code committed to main branch
- [x] Extension v1.5.0 built and tested
- [x] Migration 008 created and tested locally
- [ ] Production database backup completed
- [ ] Deno Deploy project ready
- [ ] Ready to deploy

---

## 📦 Deployment Order

**IMPORTANT**: Deploy in this exact order:

1. Database Migration
2. Backend Deployment (auto from git)
3. Extension Distribution
4. Verification

---

## 1️⃣ Database Migration (5 minutes)

### Prerequisites
```bash
# Ensure you have production DATABASE_URL in .env
# Backup production database first!
```

### Run Migration
```bash
cd /Users/trevorthompson/dev/signals

# Set production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Run migration
deno run -A scripts/run-migration-008.ts
```

### Expected Output
```
🚀 Running migration 008: Add disclosure status to paid promo reports...

Adding disclosure_status column to paid_promo_reports table...
✅ Added disclosure_status column

Creating index on disclosure_status...
✅ Created index

Adding column comment...
✅ Added column comment

============================================================
🎉 Migration 008 completed successfully!
============================================================
```

### Verify Migration
```bash
deno run -A scripts/verify-migration-008.ts
```

### Expected Output
```
🔍 Verifying migration 008...

✅ disclosure_status column exists
   Type: text
   Default: 'disclosed'::text
✅ Index idx_paid_promo_disclosure_status exists

✅ Migration 008 verification complete!
```

### Rollback (if needed)
```sql
ALTER TABLE paid_promo_reports DROP COLUMN disclosure_status;
DROP INDEX IF EXISTS idx_paid_promo_disclosure_status;
```

---

## 2️⃣ Backend Deployment (Auto - 2 minutes)

### Deno Deploy Auto-Deployment

The backend automatically deploys from the main branch.

1. **Verify Deployment**:
   - Go to https://dash.deno.com/projects/signals
   - Check that latest commit (980508f) is deployed
   - Look for "Deployment successful" status

2. **Test API**:
```bash
# Test the count endpoint
curl "https://signals.deno.dev/api/paid-promos/count?tweetUrl=https://x.com/test/status/123"

# Expected: {"total":0,"disclosed":0,"undisclosed":0}
```

3. **Check Logs**:
   - Monitor Deno Deploy logs for any errors
   - Look for successful database connections

### Manual Deployment (if auto-deploy fails)
```bash
# Push to main again
git push origin main

# Or trigger manual deployment from Deno Deploy dashboard
```

---

## 3️⃣ Extension Distribution (10 minutes)

### Package Location
```
/Users/trevorthompson/dev/signals/signals-extension-v1.5.0.zip
```

### Distribution Methods

#### Option A: Direct Distribution
1. Share `signals-extension-v1.5.0.zip` with users
2. Provide installation instructions (see below)

#### Option B: GitHub Release
1. Go to GitHub repository
2. Create new release: v1.5.0
3. Upload `signals-extension-v1.5.0.zip`
4. Copy release notes from `RELEASE_NOTES_v1.5.0.md`
5. Publish release

#### Option C: Chrome Web Store (Future)
- Submit extension for review
- Wait for approval (3-5 days typical)
- Auto-updates for all users

### User Installation Instructions

**For Users:**

1. Download `signals-extension-v1.5.0.zip`
2. Extract the zip file
3. Open Chrome/Brave browser
4. Navigate to `chrome://extensions/`
5. Enable "Developer mode" (top right)
6. Click "Remove" on old Signals extension (if present)
7. Click "Load unpacked"
8. Select the extracted folder
9. Verify extension icon appears in toolbar
10. Refresh any open X.com tabs

---

## 4️⃣ Verification (15 minutes)

### API Health Check
```bash
# Check count endpoint structure
curl "https://signals.deno.dev/api/paid-promos/count?tweetUrl=https://x.com/gainzy222/status/1980695622345703571"

# Should return: {"total": N, "disclosed": N, "undisclosed": N}
```

### Extension Verification
1. Open X.com in Chrome
2. Navigate to any tweet
3. Open browser console (F12)
4. Check for no errors
5. Click Signals extension icon
6. Verify it loads correctly

### Functional Tests
- [ ] Can open signal dialog on a tweet
- [ ] Can select "Paid Promo" option
- [ ] Can see "Disclosed" and "Undisclosed" buttons
- [ ] "Disclosed" is pre-selected (green)
- [ ] Can enter evidence
- [ ] Can submit report successfully
- [ ] Toast notification appears on success

### UI Tests
- [ ] Navigate to a contributor profile with paid promo reports
- [ ] Verify "Paid Promo Reports" tab appears
- [ ] Click tab and see reports
- [ ] Verify disclosure badges show (green/red)
- [ ] Reports display correctly

### Database Verification
```sql
-- Check recent reports
SELECT * FROM paid_promo_reports 
ORDER BY reported_at DESC 
LIMIT 5;

-- Verify disclosure_status column
SELECT disclosure_status, COUNT(*) 
FROM paid_promo_reports 
GROUP BY disclosure_status;
```

---

## 🎬 Go-Live Sequence

### T-minus 30 minutes
- [ ] Take database backup
- [ ] Verify all team members available
- [ ] Review rollback plan

### T-minus 15 minutes
- [ ] Run migration 008 on production
- [ ] Verify migration success
- [ ] Confirm no database errors

### T-minus 5 minutes
- [ ] Verify Deno Deploy deployed latest code
- [ ] Test API endpoints
- [ ] Check logs

### T-zero (GO LIVE)
- [ ] Distribute extension v1.5.0 to users
- [ ] Post announcement
- [ ] Monitor for issues

### T-plus 15 minutes
- [ ] Verify first reports coming in
- [ ] Check error rates
- [ ] Monitor API performance

### T-plus 1 hour
- [ ] Review metrics
- [ ] Address any issues
- [ ] Gather user feedback

### T-plus 24 hours
- [ ] Full metric review
- [ ] Bug triage if needed
- [ ] Success confirmation

---

## 📊 Monitoring Queries

### Check Report Activity
```sql
-- Reports in last hour
SELECT COUNT(*) as recent_reports
FROM paid_promo_reports 
WHERE reported_at > NOW() - INTERVAL '1 hour';

-- Breakdown by disclosure status
SELECT 
  disclosure_status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM paid_promo_reports 
GROUP BY disclosure_status;
```

### Check API Performance
- Monitor Deno Deploy dashboard
- Look for 500 errors
- Check response times

### User Activity
```sql
-- Unique reporters today
SELECT COUNT(DISTINCT auth_token) as unique_reporters
FROM paid_promo_reports
WHERE reported_at > CURRENT_DATE;
```

---

## 🚨 Emergency Procedures

### If Migration Fails
```bash
# Check error message
# Usually safe to re-run migration script
# Column creation is idempotent (IF NOT EXISTS)

deno run -A scripts/run-migration-008.ts
```

### If API Returns Errors
```bash
# Check Deno Deploy logs
# Verify DATABASE_URL is set correctly
# Check for database connection issues
# Rollback code if necessary:

git revert 980508f
git push origin main
```

### If Extension Breaks
- Redistribute previous version (v1.4.0)
- Users reload extension
- Investigate issue in development
- Issue hotfix when ready

---

## ✅ Success Criteria

Deployment successful when:
- [ ] Migration 008 runs without errors
- [ ] Backend health check passes
- [ ] Extension loads without errors
- [ ] Can create test paid promo report
- [ ] Reports appear on profile pages
- [ ] Disclosure status displays correctly
- [ ] No critical errors in logs (first hour)

---

## 📞 Contacts

**Deployment Lead**: [Your name]  
**Database Admin**: [DBA name]  
**Support**: [Support channel]  

---

## 📝 Post-Deployment Tasks

- [ ] Update status page if applicable
- [ ] Post announcement to users
- [ ] Update documentation site
- [ ] Schedule post-mortem meeting
- [ ] Archive deployment artifacts

---

**Deployment Date**: _________________  
**Deployed By**: _________________  
**Verified By**: _________________  
**Status**: _________________

