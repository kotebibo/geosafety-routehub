# GeoSafety RouteHub - Location and Inspector Data Import

## Overview
Successfully processed **38 Excel files** containing location and inspector data for GeoSafety RouteHub.

## Data Summary

### Processed Data:
- **37 Inspectors** (safety inspectors)
- **896 Unique Companies** (business locations)
- **925 Company-Service-Inspector Relations**

### Inspector Distribution:
The inspectors have varying workloads:
- Largest assignment: 96 companies (ადგილზე მდგომი სპეცია)
- Average: ~24 companies per inspector
- Smallest assignment: 2 companies (პაატა ბიბიჩაძე)

## Generated Files

### 1. `import_data.sql` (12,160 lines)
The main SQL file containing:
- **37 Inspector accounts** (role: 'inspector')
  - Email format: firstname.lastname@geosafety.ge
  - IDs: 100-136
  - Note: Passwords need to be hashed

- **896 Company records** with details:
  - Company name
  - Address
  - Tax number (ს/კ)
  - Email & phone
  - Director name
  - Coordinates (default: Tbilisi center - needs geocoding)

- **Unique Services** extracted from Excel:
  - სასტუმრო (Hotel)
  - კაზინო (Casino)
  - რესტორანი (Restaurant)
  - ოფისი (Office)
  - ესთეტიკური ცენტრი (Aesthetic Center)
  - And many more...

- **Company-Service-Inspector Relations**:
  - Links companies to their services
  - Assigns inspectors to specific company services
  - Default priority: 'medium'
  - Default frequency: 30 days

### 2. `import_data_with_passwords.sql`
Same as above but with actual bcrypt password hashes.
- **Default Password**: `inspector123`
- **Password Hash**: `$2b$12$Vnkh5NHFQ1InLKvqwAgDs.FW9AxedD2BDowjSSR3TKf0W2lmccFmO`
- All inspectors should change password after first login

### 3. `import_locations.py`
Python script that processes all Excel files:
- Reads inspector names from sheet names
- Extracts company information
- Parses phone numbers and emails
- Generates SQL INSERT statements

### 4. `generate_passwords.py`
Utility script to generate bcrypt password hashes for inspectors.

### 5. `geocode_addresses.py`
Script to geocode company addresses (optional):
- Uses OpenStreetMap Nominatim API
- Adds accurate GPS coordinates
- Has rate limiting (1 request/second)
- Would take ~15 minutes to run

## Database Schema Requirements

The SQL expects these tables to exist:

```sql
-- Users table (for inspectors)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Companies table
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  tax_number VARCHAR(50) UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(50),
  director VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Services table
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  name_en VARCHAR(255),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Company-Service relations with inspector assignment
CREATE TABLE company_services (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  service_id INTEGER REFERENCES services(id),
  inspector_id INTEGER REFERENCES users(id),
  priority VARCHAR(50),
  frequency INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(company_id, service_id)
);
```

## Installation Steps

### Step 1: Prepare Database
Ensure your PostgreSQL database has the required tables (see schema above).

### Step 2: Review Generated SQL
```bash
# Open and review the file
notepad D:\geosafety-routehub\scripts\import_data_with_passwords.sql
```

### Step 3: Run SQL Import
```bash
# Using psql
psql -U your_username -d geosafety_db -f D:\geosafety-routehub\scripts\import_data_with_passwords.sql

# OR using your Node.js application
# Import via your existing migration system
```

### Step 4: (Optional) Geocode Addresses
```bash
# This will take ~15 minutes
cd D:\geosafety-routehub\scripts
python geocode_addresses.py
# Then run the generated import_data_geocoded.sql instead
```

### Step 5: Verify Data
```sql
-- Check inspectors
SELECT COUNT(*) FROM users WHERE role = 'inspector';
-- Should return: 37

-- Check companies
SELECT COUNT(*) FROM companies;
-- Should return: 896

-- Check services
SELECT COUNT(*) FROM services;
-- Should return: ~50-60 unique services

-- Check assignments
SELECT COUNT(*) FROM company_services;
-- Should return: 925
```

## Inspector Login Credentials

All inspectors can log in with:
- **Email**: (see list below)
- **Password**: `inspector123`

### Inspector Email List:
1. ზაზა.მეცხვარიშვილი@geosafety.ge
2. მარიამ.ფირცხელიანი@geosafety.ge
3. დავით.კუნჭულია@geosafety.ge
4. ნიკა.ქართველიშვილი@geosafety.ge
5. ირაკლი.გამეზარდაშვილი@geosafety.ge
6. საბა.იობიძე@geosafety.ge
7. ბაჩო.გვენეტაძე@geosafety.ge
8. მიხეილ.მელითაური@geosafety.ge
9. ანა.სანაძე@geosafety.ge
10. ვახო.გრძელიშვილი@geosafety.ge
... (and 27 more)

## Locations Map Page

Already created at `/locations` with features:
- **Interactive map** showing all company locations
- **Filters**:
  - Search by company name/address
  - Filter by inspector
  - Filter by service type
- **Color-coded markers**:
  - 🔴 Red: High priority
  - 🟠 Orange: Medium priority
  - 🟢 Green: Low priority
- **Detailed popups** with company info

Access: Navigate to `/locations` after logging in as Admin or Dispatcher.

## Notes & Considerations

### Geocoding
- Current SQL uses default Tbilisi coordinates (41.7151, 44.8271)
- For accurate location pins, run the geocoding script
- Alternative: Use Google Maps Geocoding API for better accuracy

### Password Security
- All inspectors have the same initial password
- **IMPORTANT**: Force password change on first login
- Consider implementing:
  - Password expiry policy
  - Minimum password strength requirements
  - 2FA for sensitive accounts

### Data Quality
- Some phone numbers might not be in correct format
- Some emails might be missing
- Some addresses might need manual verification
- Tax numbers (ს/კ) are used as unique identifiers

### Future Improvements
1. **Geocoding Service**: Implement automatic geocoding for new companies
2. **Excel Import UI**: Add web interface for uploading Excel files
3. **Data Validation**: Add validation rules for phone numbers, emails
4. **Bulk Operations**: Add UI for bulk editing company assignments
5. **Analytics**: Add dashboard showing inspector workload distribution
6. **Mobile App**: Develop mobile app for inspectors in the field

## Excel File Structure

Each Excel file represents one inspector with columns:
- **Name**: Company name (შპს/სს prefix)
- **მისამართი**: Address in Georgian
- **ს/კ**: Tax number (unique identifier)
- **საქმიანობა**: Type of business/service
- **პასუხ. პირი**: Responsible person (inspector)
- **მეილი**: Email address
- **ნომერი**: Phone number
- **დირექტორი**: Director name

## Troubleshooting

### If SQL Import Fails:
1. Check database connection
2. Verify table schemas exist
3. Check for conflicting IDs
4. Review error messages for constraint violations

### If Geocoding Fails:
1. Check internet connection
2. Verify Nominatim API is accessible
3. Consider using Google Maps API instead
4. Manually update critical locations

### If Map Doesn't Show Locations:
1. Verify companies have valid coordinates
2. Check company_services relationships exist
3. Ensure inspectors are properly assigned
4. Check browser console for JavaScript errors

## Contact

For issues or questions about the import:
- Review the generated SQL files
- Check the Python scripts for logic
- Test with a small subset first
- Backup database before running full import

---
**Generated**: November 10, 2025
**Data Source**: 38 Excel files from GeoSafety inspection system
**Total Records**: 896 companies, 37 inspectors, 925 relations
