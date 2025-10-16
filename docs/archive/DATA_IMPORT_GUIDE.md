ეიფთი: 45
  - ჯი ეი ემ ქორფი: 30
  - ბლექ: 15

By City:
  - თბილისი: 250
  - ბათუმი: 50

Contact Info:
  - With Email: 280
  - With Phone: 295

📁 Data saved to: D:\geosafety-routehub\data\seeds\real-company-data.json
```

### Step 2: Seed Database
```bash
npm run seed:db
```

**What this does:**
- Loads the JSON data from Step 1
- Maps data to database schema
- Transforms categories and statuses
- Inserts companies in batches (50 at a time)
- Creates proper relationships

**Expected Output:**
```
🌱 Seeding 300+ companies to database...

✅ Inserted batch 1/7 (50/300)
✅ Inserted batch 2/7 (100/300)
✅ Inserted batch 3/7 (150/300)
✅ Inserted batch 4/7 (200/300)
✅ Inserted batch 5/7 (250/300)
✅ Inserted batch 6/7 (300/300)

✨ Successfully seeded 300 companies!

📊 Statistics:
  Total in database: 300
  By Category: {
    "corporate": 85,
    "premium_safety": 45,
    "standard": 30
  }
  By City: {
    "თბილისი": 250,
    "ბათუმი": 50
  }
```

### Step 3 (Optional): Run Both at Once
```bash
npm run setup:data
```

This runs both import and seed in sequence.

## 📋 Data Structure

### Excel Column Mapping

**Main Contact File** (`პერსონალური მონაცემები...`):
```
Column A (0)  → Company Name
Column B (1)  → Assigned Person
Column C (2)  → Tax ID
Column D (3)  → Category
Column E (4)  → Activity Type
Column F (5)  → Status
Column G (6)  → Director
Column H (7)  → Contact Number
Column I (8)  → Email
Column J (9)  → Address
```

**Sales Rep Files**:
```
Column A (0)  → Company Name
Column B (1)  → Assigned Person
Column C (2)  → Tax ID
Column D (3)  → Category
Column E (4)  → Activity Type
Column F (5)  → General Status
Column G (6)  → Monthly Report
Column H (7)  → Last Visit Date
Column I (8)  → Start Date
Column J (9)  → First Meeting Date
Column K (10) → Policy Doc Status
...
Column R (17) → Director
Column S (18) → Contact
Column T (19) → Email
Column U (20) → Address
```

## 🔄 Data Transformations

### Category Mapping
```typescript
Georgian → English (Database)
------------------------------
"ქორფ"              → "corporate"
"ბლექ"              → "blacklist"
"ჯეო"               → "geo"
"პრემიუმ სეიფთი"    → "premium_safety"
"სეიფთი ქორფ"      → "safety_corporate"
(default)           → "standard"
```

### Activity Type Mapping
```typescript
Georgian → English
------------------
"კლინიკა"           → "clinic"
"კაზინო"            → "casino"
"სარესტორნო"       → "restaurant"
"ოფისი"             → "office"
"სამშენებლო"        → "construction"
"სასტუმრო"          → "hotel"
"უნივერსიტეტი"     → "university"
"სკოლა"             → "school"
"მიკროსაფიანანსო"  → "finance"
"სამორინე"          → "maritime"
(default)           → "other"
```

### Status Mapping
```typescript
Georgian → English
------------------
"პროცესშია"         → "in_process"
"დადასტურებული"    → "confirmed"
"არ არის"           → "not_interested"
(default)           → "pending"
```

### Address Parsing
- Extracts city (თბილისი or ბათუმი)
- Removes "ქ. თბილისი," prefix
- Cleans and normalizes street addresses
- Default city: თბილისი

### Phone Number Extraction
- Finds Georgian mobile format: +995 5XX XX XX XX
- Removes spaces
- Falls back to first 20 chars if no match

## 📊 Generated Data Structure

### JSON Output Format
```json
{
  "companies": [
    {
      "name": "შპს ინ ვიტრო განაყოფიერების ცენტრი",
      "identificationNumber": "202462708",
      "category": "ქორფ",
      "activity": "კლინიკა",
      "generalStatus": "პროცესშია",
      "address": "ნოდარ ბოხუას ქ. N21",
      "city": "თბილისი",
      "contact": "577 654 405",
      "email": "Giorgi.ambroliani@leadermed.ge",
      "director": "გიორგი ამბროლიანი",
      "salesRep": "pikria kereselidze"
    }
  ],
  "stats": {
    "total": 300,
    "byCategory": { "ქორფ": 85, "პრემიუმ სეიფთი": 45 },
    "byCity": { "თბილისი": 250, "ბათუმი": 50 },
    "byActivity": { "კლინიკა": 30, "ოფისი": 120 },
    "withEmail": 280,
    "withPhone": 295
  }
}
```

### Database Schema Mapping
```typescript
// Excel Data → Database Table
{
  name: string              → companies.name
  identificationNumber      → companies.tax_id
  category (mapped)         → companies.category
  activity (mapped)         → companies.type
  generalStatus (mapped)    → companies.status
  address                   → companies.street
  city                      → companies.city
  contact (extracted)       → companies.phone
  email                     → companies.email
  director                  → companies.contact_person
  lastVisit                 → companies.last_visit
  salesRep                  → companies.notes
}
```

## 🛠️ Troubleshooting

### Issue: "Company data file not found"
**Solution**: Run `npm run import-data` first before seeding

### Issue: Excel file not found
**Solution**: Ensure all Excel files are in `C:\Users\HP\Downloads`

### Issue: Supabase connection error
**Solution**: Check your `.env.local` file has correct Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### Issue: Duplicate companies
**Solution**: Clear database before re-seeding:
```sql
-- In Supabase SQL Editor
DELETE FROM companies;
```

### Issue: TypeScript errors
**Solution**: Install missing dependencies:
```bash
npm install --save-dev ts-node @types/node
npm install xlsx
```

## 📈 Data Quality Checks

After importing, verify your data:

### 1. Check Company Count
```sql
SELECT COUNT(*) as total FROM companies;
```

### 2. Companies by Category
```sql
SELECT category, COUNT(*) as count 
FROM companies 
GROUP BY category 
ORDER BY count DESC;
```

### 3. Companies by City
```sql
SELECT city, COUNT(*) as count 
FROM companies 
GROUP BY city;
```

### 4. Companies with Missing Contact Info
```sql
SELECT name, phone, email 
FROM companies 
WHERE phone IS NULL OR email IS NULL;
```

### 5. Recent Visits
```sql
SELECT name, last_visit 
FROM companies 
WHERE last_visit IS NOT NULL 
ORDER BY last_visit DESC 
LIMIT 10;
```

## 🎯 Next Steps

After seeding your data:

1. **Generate Routes**: Use the route builder to create optimized daily routes
2. **Assign Sales Reps**: Link companies to their assigned representatives
3. **Schedule Visits**: Create visit schedules based on last visit dates
4. **Setup Notifications**: Configure reminders for upcoming visits
5. **Import Historical Data**: Add past visit records for better analytics

## 📝 Maintenance

### Updating Data
To update with new Excel data:
```bash
# 1. Place new Excel files in Downloads folder
# 2. Re-import (this updates the JSON)
npm run import-data

# 3. Clear old data (optional - or it will duplicate)
# Run in Supabase SQL Editor: DELETE FROM companies;

# 4. Re-seed database
npm run seed:db
```

### Incremental Updates
For adding new companies without clearing:
```bash
# Just run seed - it will skip duplicates based on tax_id
npm run seed:db
```

## 🔐 Data Privacy

**Important**: The real company data contains sensitive information:
- Company names and tax IDs
- Personal contact information
- Email addresses and phone numbers
- Business relationships

**Security measures**:
1. ✅ JSON files are in `.gitignore` (not committed to Git)
2. ✅ Excel files stay local (not uploaded)
3. ✅ Database access controlled by Supabase RLS
4. ✅ Service keys in environment variables only

**Never commit**:
- `data/seeds/real-company-data.json`
- Original Excel files
- `.env.local` with real credentials

## 📚 Additional Resources

- **Supabase Docs**: https://supabase.com/docs
- **TypeScript Guide**: https://www.typescriptlang.org/docs/
- **Excel File Handling**: https://docs.sheetjs.com/

---

**Created by Claude** | Last updated: October 2025
