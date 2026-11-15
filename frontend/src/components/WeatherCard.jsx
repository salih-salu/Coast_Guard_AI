import { useEffect, useState } from "react";
import { getLiveWeatherByCoords } from "../services/weather_api";

function WeatherCard({ title = "🌤️ Live Coastal Weather" }) {
    const [weather, setWeather] = useState(null);
    const [gpsEnabled, setGpsEnabled] = useState(true);

    const loadWeather = async (lat, lon) => {
        try {
            const live = await getLiveWeatherByCoords(lat, lon);
            setWeather(live);
        } catch (err) {
            console.warn("Weather load error:", err);
        }
    };

    const requestGps = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    setGpsEnabled(true);
                    await loadWeather(pos.coords.latitude, pos.coords.longitude);
                },
                () => {
                    setGpsEnabled(false);
                    setWeather(null);
                },
                { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
            );
        } else {
            setGpsEnabled(false);
            setWeather(null);
        }
    };

    useEffect(() => {
        requestGps();
    }, []);

    const safe = weather && Number(weather.wave_height || 0) < 2.5 && Number(weather.wind_speed || 0) < 35;

    return (
        <section className="dashboard-weather" id="weather" style={{ marginBottom: "24px" }}>
            <div className="section-header">
                <h2 className="section-title">{title}</h2>
            </div>

            {!gpsEnabled ? (
                <div
                    className="weather-card"
                    style={{
                        textAlign: "center",
                        padding: "32px 20px",
                        background: "var(--card)",
                        border: "1px dashed var(--line)",
                        borderRadius: "16px",
                    }}
                >
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>📡</div>
                    <h3 style={{ fontSize: "17px", marginBottom: "6px" }}>Location is Turned Off</h3>
                    <p className="muted" style={{ fontSize: "13.5px", maxWidth: "340px", margin: "0 auto 16px" }}>
                        Turn on device GPS to view real-time sea wave height, wind, and coastal surge alerts.
                    </p>
                    <button className="btn btn-primary" onClick={requestGps}>
                        Turn On Location 📍
                    </button>
                </div>
            ) : weather ? (
                <div className="weather-card">
                    <div className="weather-main">
                        <p className="location">📍 {weather.location}</p>
                        <div className="temp">{weather.temp}°C</div>
                        <p className="condition">{weather.condition}</p>

                        <span className={`status ${safe ? "safe" : "danger"}`}>
                            {safe ? "✅ Safe to go to sea" : "⚠️ High Surge - Caution advised"}
                        </span>
                    </div>

                    <div className="weather-grid">
                        <div className="mini">
                            <span className="mini-icon">🌊</span>
                            <b>{weather.wave_height} m</b>
                            <small>Wave height</small>
                        </div>
                        <div className="mini">
                            <span className="mini-icon">💨</span>
                            <b>{weather.wind_speed} km/h</b>
                            <small>Wind speed</small>
                        </div>
                        <div className="mini">
                            <span className="mini-icon">💧</span>
                            <b>{weather.humidity}%</b>
                            <small>Humidity</small>
                        </div>
                        <div className="mini">
                            <span className="mini-icon">👁️</span>
                            <b>{weather.visibility} km</b>
                            <small>Visibility</small>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="weather-card empty-card">
                    <p className="message">Detecting live coastal telemetry…</p>
                </div>
            )}
        </section>
    );
}

export default WeatherCard;