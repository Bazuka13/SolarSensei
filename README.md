# ☀️ SolarSensei: AI-Powered Solar Intelligence Platform

![Uploading Screenshot 2025-12-31 214206.png…]()

## 🚀 Overview
**SolarSensei** is a next-generation renewable energy dashboard designed to simplify the transition to solar power for homeowners and businesses. By combining **Satellite Data (NREL)**, **Geospatial Mapping**, and **Financial Modelling**, it provides accurate, location-specific investment analysis.

Unlike generic calculators, SolarSensei uses real-world solar flux data to generate a 25-year financial projection, ensuring users know exactly when they will break even and how much CO₂ they will offset.

---

## ❓ The Problem
Adopting solar energy is currently a complex and opaque process:
* **Information Overload:** Consumers are bombarded with technical jargon (kW, Flux, Inverters).
* **Financial Uncertainty:** It's hard to estimate the true ROI without consulting expensive agencies.
* **Generic Estimates:** Most online calculators use "average" data rather than location-specific satellite logic.

## 💡 The Solution
**SolarSensei** acts as a bridge between complex solar data and user-friendly insights.
1.  **Input:** User provides location, monthly bill, and roof area.
2.  **Process:** The Python engine queries NREL/Nominatim APIs to fetch coordinates and solar irradiance.
3.  **Output:** A comprehensive, interactive dashboard with charts, AI-driven insights, and a downloadable PDF report.

---

###!!IMPORTANT!! 
##SOME TIMES APIS ARE NOT WORKING BECAUSE OF WHICH DATA AUTOMATICALLY SWITCHES TO RULE BASED DATA.

## ✨ Key Features

### 1. 🧙‍♂️ Intelligent Investment Wizard
A step-by-step interactive form that captures user requirements without overwhelming them.
* Real-time validation for location and energy usage.
* Dynamic budget slider.
* Glassmorphism UI for a modern aesthetic.

### 2. 📊 Advanced Financial Engine (`engine.py`)
The backbone of the application, written in Python, which calculates:
* **System Sizing:** Optimal kW capacity based on roof area vs. energy needs.
* **Cost Analysis:** Includes market rates and government subsidy logic (e.g., PM Surya Ghar scheme).
* **25-Year Projection:** Calculates savings considering grid inflation vs. solar panel degradation.

### 3. 🗺️ Interactive Solar Explorer
* **Leaflet.js Integration:** A dark-themed interactive map that allows users to click anywhere on the globe.
* **Reverse Geocoding:** Automatically identifies city/state names from coordinates.
* **Solar Potential Heatmap:** Visual indicators (Green/Amber/Red) showing solar suitability of a region.

### 4. 📈 Dynamic Visualizations
Powered by **Chart.js**, the dashboard renders:
* **ROI Graph:** Grid Cost vs. Solar Savings over 25 years.
* **Monthly Generation:** Expected energy output per month based on weather patterns.
* **Sensitivity Analysis:** How different system sizes affect savings.

### 5. 🤖 AI Insights & Benchmarking
* **Smart Recommendations:** Rule-based AI generates context-aware tips (e.g., maintenance alerts, battery upgrades).
* **City Comparison:** Benchmarks the user's solar yield against top solar cities like Jodhpur or Bangalore.

### 6. 📥 Instant PDF Reports
* One-click generation of a professional PDF report using `html2pdf.js`.
* Perfect for users to save their data or share with installers.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | Python (Flask) | Handles routing, API logic, and calculation engine. |
| **Frontend** | HTML5, Tailwind CSS | Responsive, glassmorphism design system. |
| **Scripting** | JavaScript (ES6) | DOM manipulation, Chart.js, Leaflet.js, Async/Await API calls. |
| **Data APIs** | NREL PVWatts | Fetches solar irradiance and weather data. |
| **Mapping** | OpenStreetMap (Nominatim) | Geocoding and Reverse Geocoding services. |
| **Visualization** | Chart.js | Rendering interactive financial and energy graphs. |

---

## 📂 Project Structure

```bash
SolarSensei/
├── app.py              # Main Flask Application Entry Point
├── engine.py           # Core Logic: Calculations, API calls, Financial Models
├── .env                # API Keys (NREL, Gemini, etc.)
├── requirements.txt    # Python Dependencies
├── static/
│   ├── css/
│   │   └── style.css   # Custom Animations & Glassmorphism Styles
│   └── js/
│       ├── analysis.js # Frontend Logic for Wizard & Charts
│       ├── map.js      # Map Interaction Logic
│       └── script.js   # UI Effects (Magnetic Buttons, etc.)
└── templates/
    ├── index.html      # Landing Page
    ├── analyze.html    # Main Dashboard & Wizard
    ├── map.html        # Solar Explorer Map
    ├── auth.html       # Login/Signup Page
    └── layout.html     # Base Template (Navbar/Footer)
