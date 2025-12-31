from flask import Flask, render_template, request, jsonify
from models import db
from engine import get_coords, get_solar_analysis

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev'
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:admin@localhost:5432/Solar_sensei'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
with app.app_context():
    try: db.create_all()
    except: pass

@app.route('/')
def index(): return render_template('index.html')
@app.route('/analyze')
def analyze(): return render_template('analyze.html')
@app.route('/explore')
def explore(): return render_template('explore.html')
@app.route('/auth')
def auth(): return render_template('auth.html')
@app.route('/contact')
def contact(): return render_template('contact.html')




@app.route('/api/analyze', methods=['POST'])
def api_analyze():
    try:
        data = request.get_json()
        loc = data.get('location')
        bill = float(data.get('bill', 0))
        area = float(data.get('area', 0))

        lat, lon = get_coords(loc)
        if lat is None: return jsonify({"success": False, "error": "Location not found"}), 400

        analysis = get_solar_analysis(lat, lon, bill, area, location_name=loc)
        if not analysis['success']: return jsonify({"success": False, "error": analysis['error']}), 500

        analysis['location'] = loc
        return jsonify(analysis)

    except Exception as e:
        print(f"API Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/explore', methods=['POST'])
def api_explore():
    try:
        data = request.get_json()
        lat = float(data.get('lat'))
        lon = float(data.get('lon'))
        
        # 1. Get Address Name (Reverse Geocode)
        from engine import get_address_from_coords # Import kar lena
        location_name = get_address_from_coords(lat, lon)

        # 2. Get Solar Data (Reuse existing logic but for 1kW system to get per-kW metrics)
        # Hum 1kW ka system maanke chalenge taaki standard result mile
        analysis = get_solar_analysis(lat, lon, bill=1000, area=100, location_name=location_name)
        
        if not analysis['success']:
            return jsonify({"success": False, "error": "No data available"}), 500

        # 3. Prepare Snapshot Data
        return jsonify({
            "success": True,
            "location": location_name,
            "coords": f"{lat:.4f}°N, {lon:.4f}°E",
            "flux": analysis['flux'],
            "temp": 32, # NREL API temp bhi deti hai agar hum extract karein, abhi static/avg le sakte hain ya extract kar lo
            "per_kw_gen": int(analysis['metrics']['generation'] / analysis['metrics']['system_size']), # kWh per kW
            "suitability": analysis['score'], # 0-100
            "tag": analysis['tag'] # Excellent/Good etc
        })

    except Exception as e:
        print(e)
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)