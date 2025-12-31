import os
import requests
import google.genai as genai
from geopy.geocoders import Nominatim
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env/.env")
NREL_KEY = os.getenv("NREL_API_KEY")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")


# ---MAPPING SYSTEM ---
def get_address_from_coords(lat, lon):
    try:
        geolocator = Nominatim(user_agent="SolarSensei_Map_V1", timeout=5)
        # Sirf City/District chahiye
        location = geolocator.reverse((lat, lon), exactly_one=True, language='en')
        if location:
            address = location.raw.get('address', {})
            city = address.get('city') or address.get('town') or address.get('village') or address.get('county') or "Unknown Location"
            state = address.get('state', '')
            return f"{city}, {state}"
        return f"{lat:.2f}, {lon:.2f}"
    except:
        return f"{lat:.2f}, {lon:.2f}"


# --- 1. GEOCODING ---
def get_coords(location_name):
    try:
        geolocator = Nominatim(user_agent="SolarSensei_AI_V4", timeout=5)
        location = geolocator.geocode(location_name)
        if location:
            return location.latitude, location.longitude
        return 19.0760, 72.8777
    except Exception as e:
        print(f"Geocoding Error: {e}")
        return 19.0760, 72.8777

# --- 2. SYSTEM ESTIMATION ---
def estimate_system_size(bill, area):
    if not bill or not area: return 3.0
    monthly_units = bill / 8 
    needed_kw = round(monthly_units / 120, 1) 
    max_roof_kw = area / 100 
    return max(1, min(needed_kw, max_roof_kw))

# --- 3. GRAPH DATA HELPER ---
def generate_projections(annual_savings, system_cost):
    cumulative_grid_cost = []
    cumulative_solar_savings = []
    
    current_bill_yearly = annual_savings
    current_savings = annual_savings
    total_grid = 0
    total_saved = 0 - system_cost 
    
    for _ in range(25):
        total_grid += current_bill_yearly
        cumulative_grid_cost.append(int(total_grid))
        current_bill_yearly *= 1.05 
        total_saved += current_savings
        cumulative_solar_savings.append(int(total_saved))
        current_savings *= 0.995 
        
    return cumulative_grid_cost, cumulative_solar_savings

# --- 4. REAL AI INSIGHTS (GEMINI POWERED) ---
def get_gemini_insights(location, system_size, savings, cost, roi, flux):
    # Temporarily disabled due to API issues - using fallback
    return get_backup_insights(flux, roi, system_size)

# Fallback Logic (Agar AI fail ho jaye)
def get_backup_insights(flux, roi, size):
    tips = [
        f"Maintenance: Clean panels every 2 weeks to maintain {flux} kWh/m² efficiency.",
        f"ROI Alert: You will break even in {roi} years, creating free electricity afterwards.",
        "Policy: Apply for PM Surya Ghar Muft Bijli Yojana for subsidy benefits.",
        "Usage: Shift heavy appliances (AC, Washing Machine) to afternoon hours.",
        "Upgrade: Consider a hybrid inverter if your area faces frequent power cuts."
    ]
    return tips

# --- 5. MAIN ANALYSIS ENGINE ---
def get_solar_analysis(lat, lon, bill, area, location_name="India"):
    if not NREL_KEY: return {"success": False, "error": "NREL API Key Missing"}

    system_capacity = estimate_system_size(bill, area)
    
    url = "https://developer.nrel.gov/api/pvwatts/v8.json"
    params = {
        "api_key": NREL_KEY, "lat": lat, "lon": lon, "system_capacity": system_capacity,
        "azimuth": 180, "tilt": 20, "array_type": 1, "module_type": 1, "losses": 14
    }
    
    try:
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()
        if "errors" in data and data["errors"]: return {"success": False, "error": str(data["errors"])}

        out = data['outputs']
        annual_gen = int(out['ac_annual'])
        avg_flux = round(out['solrad_annual'], 2)
        monthly_gen = out['ac_monthly']
        
        est_cost = int(system_capacity * 50000) 
        annual_savings = int(annual_gen * 8)
        co2 = round((annual_gen * 0.82) / 1000, 1)
        
        subsidy = 0
        if system_capacity <= 2: subsidy = system_capacity * 30000
        elif system_capacity <= 3: subsidy = (2 * 30000) + ((system_capacity-2) * 18000)
        else: subsidy = 78000
        final_cost = est_cost - subsidy

        grid_curve, solar_curve = generate_projections(annual_savings, est_cost)
        
        yield_per_kw = annual_savings / system_capacity
        sensitivity_data = {
            "sizes": [3, 5, 8, 10],
            "savings": [int(3*yield_per_kw), int(5*yield_per_kw), int(8*yield_per_kw), int(10*yield_per_kw)]
        }

        user_yield = annual_gen / system_capacity
        comparison = [
            {"city": "Jodhpur", "yield": 1650, "user": int(user_yield)},
            {"city": "Ahmedabad", "yield": 1550, "user": int(user_yield)},
            {"city": "Bangalore", "yield": 1450, "user": int(user_yield)}
        ]

        score = int(min(98, max(40, (avg_flux/6.5)*100)))
        tag = "Excellent" if score > 85 else "Great" if score > 70 else "Good"

        # CALL REAL AI
        roi_years = round(final_cost / annual_savings, 1) if annual_savings > 0 else 99
        ai_recommendations = get_gemini_insights(location_name, system_capacity, annual_savings, final_cost, roi_years, avg_flux)
        
        # Convert AI insights to pros/cons format for frontend
        pros = []
        cons = []
        for i, insight in enumerate(ai_recommendations):
            if i % 2 == 0:  # Alternate between pros and cons
                pros.append(insight)
            else:
                cons.append(insight)
        
        # Ensure we have at least some insights
        if not pros: pros = get_backup_insights(avg_flux, roi_years, system_capacity)[:3]
        if not cons: cons = get_backup_insights(avg_flux, roi_years, system_capacity)[3:]

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
                "sensitivity": sensitivity_data
            },
            "comparison": comparison,
            "insights": {"pros": pros, "cons": cons},
            "flux": avg_flux,
            "score": score,
            "tag": tag
        }

    except Exception as e:
        print(f"Engine Error: {e}")
        return {"success": False, "error": str(e)}