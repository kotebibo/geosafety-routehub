import requests
import sys
import io

# Fix encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

SUPABASE_URL = "https://rjnraabxbpvonhowdfuc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbnJhYWJ4YnB2b25ob3dkZnVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5MDg4MiwiZXhwIjoyMDc0OTY2ODgyfQ.sznkahp94LAsnLh7h0HchEZPySMnnnEMcb86cM8YGSM"

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

print("=" * 80)
print("Activating all companies and assigning Labor Safety service")
print("=" * 80)

# Step 1: Get Labor Safety service type ID
print("\n1. Getting Labor Safety service type ID...")
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/service_types?name_ka=eq.შრომის უსაფრთხოება&select=id",
    headers=headers
)
service_types = response.json()

if not service_types:
    print("ERROR: Labor Safety service type not found!")
    sys.exit(1)

labor_safety_id = service_types[0]['id']
print(f"✅ Found Labor Safety service type: {labor_safety_id}")

# Step 2: Activate all non-active companies
print("\n2. Activating all non-active companies...")
response = requests.patch(
    f"{SUPABASE_URL}/rest/v1/companies?status=neq.active",
    headers=headers,
    json={'status': 'active'}
)

if response.status_code == 204:
    print("✅ Successfully activated all companies!")
else:
    print(f"Response: {response.status_code} - {response.text}")

# Step 3: Get all active companies without services
print("\n3. Finding companies without services...")
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/companies?status=eq.active&select=id,name",
    headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Range': '0-999'}
)
all_companies = response.json()
print(f"Found {len(all_companies)} total active companies")

# Get all company_services
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/company_services?status=eq.active&select=company_id",
    headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Range': '0-999'}
)
companies_with_services = {cs['company_id'] for cs in response.json()}
print(f"Found {len(companies_with_services)} companies with services")

# Find companies without services
companies_without_services = [c for c in all_companies if c['id'] not in companies_with_services]
print(f"Need to assign services to {len(companies_without_services)} companies")

# Step 4: Assign Labor Safety service to companies without services
print("\n4. Assigning Labor Safety service...")
assigned_count = 0

for i, company in enumerate(companies_without_services, 1):
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/company_services",
            headers=headers,
            json={
                'company_id': company['id'],
                'service_type_id': labor_safety_id,
                'priority': 'medium',
                'status': 'active'
            }
        )
        
        if response.status_code in [200, 201]:
            assigned_count += 1
            if assigned_count % 50 == 0:
                print(f"   Assigned {assigned_count} services...")
        else:
            print(f"   ERROR for {company['name']}: {response.status_code}")
            
    except Exception as e:
        print(f"   ERROR for {company['name']}: {e}")

print(f"\n✅ Successfully assigned Labor Safety to {assigned_count} companies!")

# Step 5: Final verification
print("\n5. Final verification...")
response = requests.get(
    f"{SUPABASE_URL}/rest/v1/companies?status=eq.active&select=id",
    headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Prefer': 'count=exact', 'Range': '0-0'}
)
total_active = int(response.headers.get('Content-Range', '0/0').split('/')[-1])

response = requests.get(
    f"{SUPABASE_URL}/rest/v1/company_services?status=eq.active&select=company_id",
    headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Range': '0-999'}
)
companies_with_services_final = len(set(cs['company_id'] for cs in response.json()))

print(f"\n📊 Final Results:")
print(f"   Total active companies: {total_active}")
print(f"   Companies with services: {companies_with_services_final}")
print(f"   Companies without services: {total_active - companies_with_services_final}")
print("\n" + "=" * 80)
print("✅ COMPLETE! All companies are now active and have services assigned!")
print("=" * 80)
