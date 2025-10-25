# Signals v1.5.0 Release Notes

**Release Date**: TBD  
**Type**: Feature Release  
**Extension Version**: 1.5.0  
**Backend Version**: Compatible with main branch (commit 980508f)

---

## 🎉 What's New

### Paid Promo Disclosure Status Tracking

The headline feature of v1.5.0 is the ability to track whether paid promotions are properly disclosed or not.

#### For Users:
When reporting a tweet as a paid promo, you can now specify:
- **Disclosed** ✅ - The content clearly states it's a paid partnership
- **Undisclosed** ⚠️ - The content doesn't mention it's a paid promotion

#### Why This Matters:
Undisclosed paid promotions are a significant issue in the crypto space. They can mislead investors and create unfair market conditions. By tracking disclosure status, the Signals community can:
- Identify accounts that frequently post undisclosed promos
- Reward transparency by highlighting proper disclosures
- Help users make more informed decisions about content credibility

---

## ✨ New Features

### 1. Disclosure Status Selection
- **Location**: Extension dialog when reporting paid promos
- **Options**: Two clear buttons - "Disclosed" (green) and "Undisclosed" (red)
- **Default**: "Disclosed" is pre-selected to encourage positive identification
- **UX**: Visual feedback with color-coded styling

### 2. Enhanced Tweet Indicators
- **Format**: "N reported as paid promo (disclosure status)"
- **Examples**:
  - "3 reported as paid promo (disclosed)"
  - "5 reported as paid promo (undisclosed)"
  - "8 reported as paid promo (disclosed and undisclosed)"
- **Styling**: Orange text for visibility
- **Action**: Clicks through to contributor profile

### 3. Profile Page Enhancements
- **Badges**: Color-coded disclosure status on each report
  - Green badge: "Disclosed"
  - Red badge: "Undisclosed"
- **Tabs**: Separate view for Signals and Paid Promo Reports
- **Stats**: Count of paid promo reports in header

### 4. Database Improvements
- **New Column**: `disclosure_status` on `paid_promo_reports` table
- **Validation**: Enforces only "disclosed" or "undisclosed" values
- **Index**: Optimized queries for disclosure status filtering
- **Default**: All existing reports default to "disclosed"

---

## 🔧 Technical Changes

### Database
- **Migration 008**: Adds disclosure status support
- **Schema**: `disclosure_status TEXT NOT NULL DEFAULT 'disclosed'`
- **Constraint**: `CHECK (disclosure_status IN ('disclosed', 'undisclosed'))`
- **Index**: `idx_paid_promo_disclosure_status` for performance

### API Updates
- **POST `/api/paid-promos/[username]`**:
  - Now accepts `disclosureStatus` parameter
  - Defaults to "disclosed" if not provided
  
- **GET `/api/paid-promos/count`**:
  - Returns object: `{total, disclosed, undisclosed}`
  - Previous format returned just a number

### Frontend
- **ContributorSignalsList Component**:
  - Added disclosure status badges
  - Color-coded visual indicators
  - Responsive design

### Extension
- **Dialog UI**:
  - New disclosure status buttons
  - Conditional field visibility
  - Enhanced validation
  
- **Content Script**:
  - Smart aggregation of disclosure status
  - Cleaner production code (removed debug logs)
  - Improved error handling

---

## 🚀 Upgrade Instructions

### For Users:

1. **Download** the new extension (v1.5.0)
2. **Navigate** to `chrome://extensions/`
3. **Enable** Developer mode
4. **Remove** old Signals extension
5. **Click** "Load unpacked"
6. **Select** the extracted v1.5.0 folder
7. **Refresh** any open X.com tabs

### For Developers:

```bash
# Pull latest changes
git pull origin main

# Run migration 008
deno run -A scripts/run-migration-008.ts

# Verify migration
deno run -A scripts/verify-migration-008.ts

# Backend auto-deploys from main branch
```

---

## 📊 Data Migration

- **Existing Reports**: Automatically default to "disclosed"
- **Data Integrity**: All reports maintain their original data
- **Backward Compatibility**: Old reports display correctly with new UI

---

## 🐛 Bug Fixes

- Fixed issue where "undefined" was showing on tweets with no reports
- Improved error handling for API failures
- Better URL matching for paid promo count queries
- Removed excessive console logging

---

## ⚡ Performance Improvements

- Added database index for faster disclosure status queries
- Optimized API response structure
- Reduced extension console output
- Cleaner error handling without spam

---

## 🔒 Security

- All reports require authentication
- Rate limiting on paid promo report creation
- Validation of disclosure status values at database level
- XSS protection in UI rendering

---

## 📱 Compatibility

- **Chrome/Brave**: v100+
- **Extension**: Manifest V3
- **Backend**: Deno 1.x
- **Database**: PostgreSQL 14+

---

## 🎨 UI/UX Improvements

- **Visual Hierarchy**: Orange text stands out for paid promo warnings
- **Color Psychology**: Green (disclosed) = positive, Red (undisclosed) = warning
- **Default Selection**: Encourages proper reporting behavior
- **Progressive Disclosure**: Only shows relevant fields based on selection

---

## 📚 Documentation

New documentation available:
- `LAUNCH_CHECKLIST_v1.5.0.md` - Complete deployment guide
- Migration scripts with inline documentation
- Updated database schema documentation

---

## 🔮 What's Next

Future enhancements being considered:
- Analytics dashboard for disclosure trends
- Reputation system for reporters
- Browser notifications for undisclosed promos from followed accounts
- Export functionality for reports
- Advanced filtering by disclosure status

---

## 🙏 Acknowledgments

Thank you to the Signals community for:
- Providing feedback on the paid promo feature
- Testing early versions
- Helping identify transparency issues in the crypto space

---

## 🐞 Known Issues

None at this time. Please report any issues you encounter.

---

## 📞 Support

- **Issues**: GitHub Issues
- **Questions**: Check documentation first
- **Emergency**: Rollback procedure in LAUNCH_CHECKLIST

---

## 📝 Changelog Summary

```
Added:
- Disclosure status selection for paid promo reports
- Enhanced tweet indicators with disclosure information
- Color-coded badges in UI
- Database column for disclosure tracking
- Migration 008 and related scripts

Changed:
- API count endpoint returns structured object
- Extension dialog UI with new buttons
- Profile page layout with tabs

Fixed:
- "undefined" appearing on tweets without reports
- Excessive console logging
- URL matching for paid promo queries

Removed:
- Debug logging from production build
- Unnecessary console output
```

---

**Full Diff**: https://github.com/trust-ethos/ethos-signals/compare/0251a44...980508f

**Download**: `signals-extension-v1.5.0.zip`

