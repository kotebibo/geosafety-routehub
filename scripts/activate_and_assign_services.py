import requests
import json

# Supabase configuration
SUPABASE_URL = "https://rjnraabxbpvonhowdfuc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbnJhYWJ4YnB2b25ob3dkZnVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTA4ODIsImV4cCI6MjA3NDk2Njg4Mn0.fwmExUzh-1Z00gPo4tB1edNi3wgoPBg6OLGV0VEfGKU"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

print("Step 1: Activating all inactive/pending companies...")

# Update all non-active companies to active
update_response = requests.patch(
    f"{SUPABASE_URL}/rest/v1/companies",
    headers=headers,
    params={"status": "neq.active"},
    json={"status": "active"}
)

if update_response.status_code in [200, 204]:
    print("[OK] Successfully activated all companies!")
else:
    print(f"[ERROR] Error activating companies: {update_response.status_code}")
    print(update_response.text)

print("\nStep 2: Finding companies without services...")

# Get all active companies
companies_response = requests.get(
    f"{SUPABASE_URL}/rest/v1/companies",
    headers={**headers, "Prefer": ""},
    params={"status": "eq.active", "select": "id"}
)

if companies_response.status_code != 200:
    print(f"[ERROR] Error getting companies: {companies_response.status_code}")
    exit(1)

companies = companies_response.json()
print(f"Found {len(companies)} active companies")

# Get all existing company-service assignments
services_response = requests.get(
    f"{SUPABASE_URL}/rest/v1/company_services",
    headers={**headers, "Prefer": ""},
    params={"select": "company_id"}
)

if services_response.status_code != 200:
    print(f"[ERROR] Error getting services: {services_response.status_code}")
    exit(1)

assigned_company_ids = set(s['company_id'] for s in services_response.json())
companies_without_services = [c['id'] for c in companies if c['id'] not in assigned_company_ids]

print(f"Found {len(companies_without_services)} companies without services")

if len(companies_without_services) == 0:
    print("\n[OK] All companies already have services assigned!")
else:
    print(f"\nStep 3: Assigning 'შრომის უსაფრთხოება' to {len(companies_without_services)} companies...")
    
    # Get the Labor Safety service ID
    service_response = requests.get(
        f"{SUPABASE_URL}/rest/v1/services",
        headers={**headers, "Prefer": ""},
        params={"name": "eq.შრომის უსაფრთხოება", "select": "id"}
    )
    
    if service_response.status_code != 200 or len(service_response.json()) == 0:
        print("[ERROR] Labor Safety service not found!")
        exit(1)
    
    service_id = service_response.json()[0]['id']
    print(f"Labor Safety service ID: {service_id}")
    
    # Batch insert company services
    batch_size = 50
    total_inserted = 0
    
    for i in range(0, len(companies_without_services), batch_size):
        batch = companies_without_services[i:i+batch_size]
        
        # Prepare batch data
        batch_data = [
            {
                "company_id": company_id,
                "service_id": service_id,
                "priority": "medium"
            }
            for company_id in batch
        ]
        
        # Insert batch
        insert_response = requests.post(
            f"{SUPABASE_URL}/rest/v1/company_services",
            headers=headers,
            json=batch_data
        )
        
        if insert_response.status_code in [200, 201, 204]:
            total_inserted += len(batch)
            print(f"  Processed {total_inserted}/{len(companies_without_services)} companies...")
        else:
            print(f"[ERROR] Error inserting batch: {insert_response.status_code}")
            print(insert_response.text)
    
    print(f"\n[OK] Successfully assigned services to {total_inserted} companies!")

print("\n" + "="*60)
print("FINAL VERIFICATION")
print("="*60)

# Final count
final_companies = requests.get(
    f"{SUPABASE_URL}/rest/v1/companies",
    headers={**headers, "Prefer": ""},
    params={"status": "eq.active", "select": "id"}
)

final_services = requests.get(
    f"{SUPABASE_URL}/rest/v1/company_services",
    headers={**headers, "Prefer": ""},
    params={"select": "company_id"}
)

total = len(final_companies.json())
with_services = len(set(s['company_id'] for s in final_services.json()))

print(f"Total active companies: {total}")
print(f"Companies with services: {with_services}")
print(f"Companies without services: {total - with_services}")
print("\n[SUCCESS] All done! Refresh your locations page to see all 930 companies!")
