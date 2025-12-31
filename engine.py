import os
import requests
import google.genai as genai
from geopy.geocoders import Nominatim
from dotenv import load_dotenv

# Load Environment Variables
load_dotenv()

NREL_KEY = os.getenv("NREL_API_KEY")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")

# --- DEBUGGING LOGS ---
print("------------------------------------------------")
print(f"[INFO] NREL Key Found: {'Yes' if NREL_KEY else 'No'}")
print(f"[INFO] Gemini Key Found: {'Yes' if GEMINI_KEY else 'No'}")
print("------------------------------------------------")

# --- CONFIGURE GEMINI ---
if GEMINI_KEY:
    try:
        genai.configure(api_key=GEMINI_KEY)
    except Exception as e:
        print(f"[ERROR] Gemini Configuration Failed: {e}")

# --- 1. GEOCODING SYSTEM ---
def get_address_from_coords(lat, lon):
    """
    Converts latitude/longitude to a readable address (City, State).
    """
    try:
        geolocator = Nominatim(user_agent="SolarSensei_Map_V1", timeout=5)
        location = geolocator.reverse((lat, lon), exactly_one=True, language='en')
        if location:
            address = location.raw.get('address', {})
            city = address.get('city') or address.get('town') or address.get('village') or "Unknown"
            state = address.get('state', '')
            return f"{city}, {state}"
        return f"{lat:.2f}, {lon:.2f}"
    except Exception as e:
        print(f"[WARNING] Reverse Geocoding failed: {e}")
        return f"{lat:.2f}, {lon:.2f}"

def get_coords(location_name):
    """
    Converts a location name (e.g., 'Mumbai') to coordinates.
    """
    try:
        geolocator = Nominatim(user_agent="SolarSensei_AI_V4", timeout=5)
        location = geolocator.geocode(location_name)
        if location:
            return location.latitude, location.longitude
        # Default fallback: Mumbai coordinates
        return 19.0760, 72.8777
    except Exception as e:
        print(f"[ERROR] Geocoding Error: {e}")
        return 19.0760, 72.8777

# --- 2. SYSTEM ESTIMATION ---
def estimate_system_size(bill, area):
    """
    Rule of thumb: 1kW generates ~120 units/month.
    """
    if not bill or not area: return 3.0
    
    monthly_units = bill / 8  # Approx cost per unit is 8 INR
    needed_kw = round(monthly_units / 120, 1)
    max_roof_kw = area / 100  # Approx 100 sqft needed per 1kW
    
    # Return limits: Min 1kW, Max restricted by roof or usage
    return max(1, min(needed_kw, max_roof_kw))

# --- 3. GRAPH DATA HELPER ---
def generate_projections(annual_savings, system_cost):
    """
    Generates 25-year projection data for graphs.
    Assumes grid electricity cost rises 5% annually, solar degrades 0.5% annually.
    """
    cumulative_grid_cost = []
    cumulative_solar_savings = []
    
    current_bill_yearly = annual_savings
    current_savings = annual_savings
    
    total_grid = 0
    total_saved = 0 - system_cost  # Start negative (initial investment)
    
    for _ in range(25):
        # Grid Scenario
        total_grid += current_bill_yearly
        cumulative_grid_cost.append(int(total_grid))
        current_bill_yearly *= 1.05  # 5% inflation
        
        # Solar Scenario
        total_saved += current_savings
        cumulative_solar_savings.append(int(total_saved))
        current_savings *= 0.995  # 0.5% degradation
        
    return cumulative_grid_cost, cumulative_solar_savings

# --- 4. AI INSIGHTS ENGINE ---
def get_backup_insights(flux, roi, size):
    """Fallback logic used if the AI API fails."""
    print("[INFO] Using Backup Insights (Gemini Unavailable)")
    return [
        f"Maintenance: Clean panels every 2 weeks to maintain {flux} kWh/m2 efficiency.",
        f"ROI Alert: You will break even in {roi} years, creating free electricity afterwards.",
        "Policy: Apply for central government subsidies to reduce installation costs.",
        "Usage: Shift heavy appliances to afternoon hours to maximize solar usage.",
        "Upgrade: Consider a hybrid inverter if your area faces frequent power cuts."
    ]

def get_gemini_insights(location, system_size, savings, cost, roi, flux):
    """
    Fetches personalized solar advice using Google Gemini AI.
    """
    if not GEMINI_KEY:
        print("[ERROR] Gemini API Key is missing.")
        return get_backup_insights(flux, roi, system_size)

    print("[INFO] Contacting Gemini AI...")
    
    try:
        # Prompt Engineering
        prompt = f"""
        You are an expert Solar Energy Consultant for a homeowner in {location}. 
        Here is their analysis data:
        - Recommended System: {system_size} kW
        - Yearly Savings: INR {savings}
        - Net Installation Cost: INR {cost}
        - ROI Period: {roi} years
        - Solar Flux: {flux} kWh/m2/day

        Write exactly 3 distinct, high-value insights for them.
        1. Financial Insight (Focus on ROI/Savings).
        2. Technical/Maintenance Insight (Focus on flux/cleaning).
        3. Strategic Insight (Policy/Battery/Usage).

        Output ONLY the 3 sentences as a list. No intro, no numbering, no asterisks.
        """
        
        model = genai.GenerativeModel('gemini-pro') 
        response = model.generate_content(prompt)
        
        if response.text:
            cleaned_text = response.text.strip()
            # Clean up formatting (remove bullets, numbers, etc.)
            insights = [
                line.strip().replace('*', '').replace('-', '').replace('1.', '').replace('2.', '').replace('3.', '').strip() 
                for line in cleaned_text.split('\n') 
                if line.strip()
            ]
            
            print("[SUCCESS] Gemini Insights Generated")
            return insights[:3] # Ensure exactly 3
            
    except Exception as e:
        print(f"[ERROR] Gemini API crashed: {str(e)}")
        return get_backup_insights(flux, roi, system_size)

    return get_backup_insights(flux, roi, system_size)

# --- 5. MAIN CONTROLLER ---
def get_solar_analysis(lat, lon, bill, area, location_name="India"):
    # --- Fetch Solar Data (NREL) ---
    if not NREL_KEY:
        print("[WARNING] NREL Key Missing - Using Mock Solar Data")
        avg_flux = 5.5
        system_capacity = estimate_system_size(bill, area)
        annual_gen = int(system_capacity * 1400)
        monthly_gen = [int(annual_gen/12)] * 12
    else:
        system_capacity = estimate_system_size(bill, area)
        url = "https://developer.nrel.gov/api/pvwatts/v8.json"
        params = {
            "api_key": NREL_KEY, "lat": lat, "lon": lon, "system_capacity": system_capacity,
            "azimuth": 180, "tilt": 20, "array_type": 1, "module_type": 1, "losses": 14
        }
        try:
            resp = requests.get(url, params=params, timeout=10)
            data = resp.json()
            
            if "errors" in data and data["errors"]: 
                print(f"[ERROR] NREL API Error: {data['errors']}")
                raise Exception("NREL API Error")

            out = data['outputs']
            annual_gen = int(out['ac_annual'])
            avg_flux = round(out['solrad_annual'], 2)
            monthly_gen = out['ac_monthly']
        except Exception as e:
            print(f"[WARNING] NREL Failed ({e}) - Switching to simulation mode")
            avg_flux = 5.2
            annual_gen = int(system_capacity * 1400)
            monthly_gen = [int(annual_gen/12)] * 12

    # --- Financial Calculations ---
    # Approx cost: 45,000 INR per kW
    est_cost = int(system_capacity * 45000) 
    
    # Savings: 8 INR per unit
    annual_savings = int(annual_gen * 8)
    
    # CO2 Offset: 0.82kg per kWh
    co2 = round((annual_gen * 0.82) / 1000, 1)
    
    # Calculate Subsidy (Standard Indian Scheme)
    subsidy = 0
    if system_capacity <= 2: 
        subsidy = system_capacity * 30000
    elif system_capacity <= 3: 
        subsidy = (2 * 30000) + ((system_capacity-2) * 18000)
    else: 
        subsidy = 78000
        
    final_cost = est_cost - subsidy
    
    # Return on Investment
    roi_years = round(final_cost / annual_savings, 1) if annual_savings > 0 else 99
    
    # Generate Graphs
    grid_curve, solar_curve = generate_projections(annual_savings, est_cost)

    # City Comparison Benchmarks
    user_yield = int(annual_gen / system_capacity) if system_capacity > 0 else 0
    comparison = [
        {"city": "Jodhpur", "yield": 1650, "user": user_yield},
        {"city": "Ahmedabad", "yield": 1550, "user": user_yield},
        {"city": "Bangalore", "yield": 1450, "user": user_yield}
    ]

    # Scoring Logic
    score = int(min(98, max(40, (avg_flux/6.5)*100)))
    tag = "Excellent" if score > 85 else "Great" if score > 70 else "Good"

    # --- Generate AI Insights ---
    ai_recommendations = get_gemini_insights(
        location_name, system_capacity, annual_savings, final_cost, roi_years, avg_flux
    )

    # --- Return Final Data Packet ---
    return {
        "success": True,
        "metrics": {
            "system_size": system_capacity,
            "cost": est_cost,
            "subsidy": int(subsidy),
            "final_cost": int(final_cost),
            "savings": annual_savings,
            "co2": co2,
            "monthly_gen": monthly_gen,
            "generation": annual_gen
        },
        "graphs": {
            "grid_vs_solar": {"grid": grid_curve, "solar": solar_curve},
            "sensitivity": {
                "sizes": [3, 5, 8, 10],
                "savings": [
                    int(3 * user_yield * 8), 
                    int(5 * user_yield * 8), 
                    int(8 * user_yield * 8), 
                    int(10 * user_yield * 8)
                ]
            }
        },
        "comparison": comparison,
        "ai_insights": ai_recommendations,
        "flux": avg_flux,
        "score": score,
        "tag": tag
    }