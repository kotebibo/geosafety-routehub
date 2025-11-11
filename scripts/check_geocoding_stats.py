import requests
import sys
import io

# Fix encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

SUPABASE_URL = "https://rjnraabxbpvonhowdfuc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqbnJhYWJ4YnB2b25ob3dkZnVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM5MDg4MiwiZXhwIjoyMDc0OTY2ODgyfQ.sznkahp94LAsnLh7h0HchEZPySMnnnEMcb86cM8YGSM"

def get_all_companies():
    """Get all companies with their coordinates"""
    url = f"{SUPABASE_URL}/rest/v1/companies?select=id,lat,lng"
    
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Range': '0-1000'  # Get more companies
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching companies: {e}")
        return []

def main():
    print("=" * 80)
    print("GEOCODING STATISTICS")
    print("=" * 80)
    
    companies = get_all_companies()
    
    if not companies:
        print("Failed to fetch companies")
        return
    
    total = len(companies)
    
    # Analyze coordinates
    exact_coords = 0
    at_tbilisi_default = 0
    null_coords = 0
    other_city_centers = 0
    
    TBILISI_DEFAULT = (41.71510000, 44.82710000)
    CITY_CENTERS = [
        (42.24880000, 42.69660000),  # Kutaisi
        (41.91860000, 45.47780000),  # Telavi
        (41.84420000, 41.85520000),  # Ozurgeti
        (42.08680000, 44.60020000),  # Mtskheta
        (41.55020000, 45.00110000),  # Rustavi
    ]
    
    for company in companies:
        lat = company.get('lat')
        lng = company.get('lng')
        
        if lat is None or lng is None:
            null_coords += 1
        elif abs(lat - TBILISI_DEFAULT[0]) < 0.0001 and abs(lng - TBILISI_DEFAULT[1]) < 0.0001:
            at_tbilisi_default += 1
        elif any(abs(lat - city[0]) < 0.0001 and abs(lng - city[1]) < 0.0001 for city in CITY_CENTERS):
            other_city_centers += 1
        else:
            exact_coords += 1
    
    has_coords = total - null_coords
    city_centers_total = at_tbilisi_default + other_city_centers
    
    print(f"\nTotal companies: {total}")
    print(f"\n✅ Companies with coordinates: {has_coords} ({has_coords/total*100:.1f}%)")
    print(f"   - Exact locations: {exact_coords} ({exact_coords/total*100:.1f}%)")
    print(f"   - City centers (Tbilisi): {at_tbilisi_default} ({at_tbilisi_default/total*100:.1f}%)")
    print(f"   - City centers (Other): {other_city_centers} ({other_city_centers/total*100:.1f}%)")
    print(f"\n❌ Companies without coordinates: {null_coords} ({null_coords/total*100:.1f}%)")
    
    print("\n" + "=" * 80)
    print(f"\nSummary:")
    print(f"   ✅ Successfully geocoded (exact): {exact_coords} companies")
    print(f"   ⚠️  Need better geocoding (at city centers): {city_centers_total} companies")
    print(f"   ❌ Failed completely (null): {null_coords} companies")
    print("\n" + "=" * 80)
    
    # Calculate what percentage we can still improve
    improvable = at_tbilisi_default + other_city_centers + null_coords
    print(f"\n🎯 Potential for improvement: {improvable} companies ({improvable/total*100:.1f}%)")
    print("=" * 80)

if __name__ == "__main__":
    main()
