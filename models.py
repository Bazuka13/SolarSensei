from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class SolarSearch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    location_name = db.Column(db.String(200))
    lat = db.Column(db.Float, nullable=False)
    lon = db.Column(db.Float, nullable=False)
    flux_value = db.Column(db.Float)
    # This stores the basic analysis for the "Explore" page