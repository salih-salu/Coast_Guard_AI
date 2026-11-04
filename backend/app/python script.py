import requests, sqlite3, time

LAT, LON = 12.97, 77.59  # replace with your coordinates
URL = (f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}"
       "&current=temperature_2m,relative_humidity_2m,wind_speed_10m")

db = sqlite3.connect("weather.db")
db.execute("""CREATE TABLE IF NOT EXISTS weather (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temperature REAL, humidity REAL, wind_speed REAL,
    recorded_at TEXT)""")

def fetch_and_store():
    r = requests.get(URL, timeout=10)
    r.raise_for_status()
    c = r.json()["current"]
    db.execute("INSERT INTO weather (temperature, humidity, wind_speed, recorded_at) VALUES (?,?,?,?)",
               (c["temperature_2m"], c["relative_humidity_2m"], c["wind_speed_10m"], c["time"]))
    db.commit()

while True:
    fetch_and_store()
    time.sleep(900)  # every 15 minutes