# 🚀 Quick Start Guide - PDP Compliance System

## 5-Minute Setup

### Step 1: Run Database Migration (2 minutes)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `supabase/migrations/005_pdp_compliance_phases.sql`
4. Click "Run"
5. ✅ You should see: "Success. No rows returned"

### Step 2: Restart Dev Server (1 minute)

```bash
cd D:\geosafety-routehub\apps\web
npm run dev
```

### Step 3: Test the System (2 minutes)

**Navigate to**: `http://localhost:3000/companies/pdp/new`

#### Test 1: Add a New Company
1. Select "ახალი კომპანია" (New Company)
2. Fill in:
   - Company Name: "Test Company 1"
   - Address: "123 Test Street"
3. Set phase dates (any future dates)
4. Click "დამატება" (Add)
5. ✅ Should redirect to company detail page

#### Test 2: Add an Existing Company
1. Navigate back to `/companies/pdp/new`
2. Select "არსებული კომპანია" (Existing Company)
3. Fill in:
   - Company Name: "Test Company 2"
   - Address: "456 Test Avenue"
4. Set next checkup date
5. Click "დამატება" (Add)
6. ✅ Should show 100% complete immediately

#### Test 3: View Dashboard
1. Navigate to `/companies/pdp`
2. ✅ You should see both test companies
3. ✅ Company 1 shows progress (0-80%)
4. ✅ Company 2 shows 100% certified

## 🎯 Common URLs

| Page | URL |
|------|-----|
| Dashboard | `/companies/pdp` |
| Add New Company | `/companies/pdp/new` |
| Company Detail | `/companies/pdp/[id]` |

## 🔧 Troubleshooting

### Problem: "Table does not exist"
**Solution**: Run the database migration first (Step 1)

### Problem: "No companies showing"
**Solution**: Add a test company (Step 3)

### Problem: "Error creating company"
**Solution**: Check console for errors. Verify:
- Migration was run successfully
- Company service is working
- You have proper authentication

### Problem: Components not found
**Solution**: Restart the dev server (Step 2)

## 📝 Quick Test Script

Copy and paste this into browser console on `/companies/pdp/new`:

```javascript
// This will help verify the service is loaded
console.log('Testing compliance service...');
import('/src/services/compliance.service.ts').then(module => {
  console.log('✅ Compliance service loaded:', module.complianceService);
}).catch(err => {
  console.error('❌ Error loading service:', err);
});
```

## 🎨 Visual Verification

After adding companies, you should see:

✅ **Dashboard**:
- Search bar at top
- Filter buttons (ყველა, მიმდინარე, სერტიფიცირებული)
- Statistics cards showing counts
- Company cards with progress bars

✅ **Company Detail**:
- Company info sidebar on left
- Phase progress tracker on right
- Progress percentage at top
- Phase status indicators

✅ **Add Form**:
- Two large buttons for company type
- Company information fields
- Phase planning section (for new)
- Checkup date (for existing)

## ⚡ Performance Check

The system should be:
- ⚡ Fast loading (< 1 second)
- 🎯 Responsive to clicks
- 📊 Smooth animations
- 🔄 Auto-updating status

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ Migration runs without errors
2. ✅ Pages load without 404s
3. ✅ Forms submit successfully
4. ✅ Dashboard shows companies
5. ✅ Progress bars display correctly
6. ✅ Filters work on dashboard
7. ✅ Search finds companies
8. ✅ Detail page shows progress
9. ✅ Status badges show correct colors
10. ✅ Georgian text displays properly

## 🚨 Known Limitations

- Geocoding not implemented in form (lat/lng set to 0)
- No email notifications yet
- No file attachments for phases
- No bulk operations
- No export functionality

These are documented as future enhancements in the main guide.

## 📞 Need Help?

1. Check `PDP_COMPLIANCE_GUIDE.md` for detailed documentation
2. Review `PDP_VISUAL_GUIDE.md` for UI mockups
3. Check `PDP_FILES_INVENTORY.md` for file locations
4. Look at TypeScript types in `src/types/compliance.ts`
5. Review service methods in `src/services/compliance.service.ts`

## 🎯 Next Steps After Testing

Once everything works:

1. **Customize**: Adjust phase names, intervals, checkup frequency
2. **Integrate**: Connect to existing navigation/menu
3. **Enhance**: Add notifications, reports, bulk actions
4. **Deploy**: Push to production when ready

---

**Time to completion**: 5 minutes
**Difficulty**: Easy
**Prerequisites**: Supabase access, dev server running
**Status**: Ready to use! 🚀
