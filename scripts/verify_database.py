"""
Quick verification script to check existing data in GeoSafety RouteHub database
This helps you understand what's already there before importing
"""

import psycopg2
from psycopg2 import sql

# Database connection settings - UPDATE THESE!
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'geosafety_db',  # Change to your database name
    'user': 'postgres',           # Change to your username
    'password': 'your_password'   # Change to your password
}

print("=" * 80)
print("GeoSafety RouteHub - Database Verification Script")
print("=" * 80)

try:
    # Connect to database
    print("\nConnecting to database...")
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    print("OK: Connected successfully!")
    
    # Check users table
    print("\n" + "-" * 80)
    print("USERS TABLE:")
    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]
    print(f"   Total users: {total_users}")
    
    cursor.execute("SELECT role, COUNT(*) FROM users GROUP BY role")
    for role, count in cursor.fetchall():
        print(f"   - {role}: {count}")
    
    # Check companies table
    print("\n" + "-" * 80)
    print("COMPANIES TABLE:")
    cursor.execute("SELECT COUNT(*) FROM companies")
    total_companies = cursor.fetchone()[0]
    print(f"   Total companies: {total_companies}")
    
    if total_companies > 0:
        cursor.execute("""
            SELECT COUNT(*) FROM companies 
            WHERE latitude = 41.7151 AND longitude = 44.8271
        """)
        default_coords = cursor.fetchone()[0]
        print(f"   Companies with default coordinates: {default_coords}")
        print(f"   Companies with real coordinates: {total_companies - default_coords}")
    
    # Check services table
    print("\n" + "-" * 80)
    print("SERVICES TABLE:")
    cursor.execute("SELECT COUNT(*) FROM services")
    total_services = cursor.fetchone()[0]
    print(f"   Total services: {total_services}")
    
    if total_services > 0:
        cursor.execute("SELECT name FROM services LIMIT 10")
        print("   Sample services:")
        for (name,) in cursor.fetchall():
            print(f"   - {name}")
    
    # Check company_services table
    print("\n" + "-" * 80)
    print("COMPANY_SERVICES TABLE:")
    cursor.execute("SELECT COUNT(*) FROM company_services")
    total_relations = cursor.fetchone()[0]
    print(f"   Total company-service relations: {total_relations}")
    
    if total_relations > 0:
        # Inspector workload
        cursor.execute("""
            SELECT u.name, COUNT(*) as assigned_count
            FROM company_services cs
            JOIN users u ON cs.inspector_id = u.id
            WHERE u.role = 'inspector'
            GROUP BY u.name
            ORDER BY assigned_count DESC
            LIMIT 10
        """)
        print("\n   Top 10 Inspectors by Assignment Count:")
        for name, count in cursor.fetchall():
            print(f"   - {name}: {count} assignments")
    
    # Check for data that would conflict with import
    print("\n" + "=" * 80)
    print("CONFLICT CHECK:")
    
    # Check if inspector IDs 100-136 are already used
    cursor.execute("""
        SELECT COUNT(*) FROM users 
        WHERE id BETWEEN 100 AND 136
    """)
    conflicting_user_ids = cursor.fetchone()[0]
    if conflicting_user_ids > 0:
        print(f"   WARNING: {conflicting_user_ids} user IDs in range 100-136 already exist!")
        print("   You may need to adjust the starting ID in the SQL file.")
    else:
        print("   OK: User ID range 100-136 is available")
    
    # Check for duplicate tax numbers
    cursor.execute("""
        SELECT tax_number, COUNT(*) 
        FROM companies 
        WHERE tax_number IS NOT NULL 
        GROUP BY tax_number 
        HAVING COUNT(*) > 1
    """)
    duplicates = cursor.fetchall()
    if duplicates:
        print(f"   WARNING: {len(duplicates)} duplicate tax numbers found in database")
    else:
        print("   OK: No duplicate tax numbers")
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 80)
    print("Verification complete!")
    print("=" * 80)
    
except psycopg2.Error as e:
    print(f"\nDATABASE ERROR: {e}")
    print("\nPlease check:")
    print("1. Database connection settings in this script")
    print("2. Database server is running")
    print("3. Database and tables exist")
    print("4. User has correct permissions")
    
except Exception as e:
    print(f"\nERROR: {e}")
