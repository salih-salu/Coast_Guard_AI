
import { useEffect, useState } from "react";
import { getAlerts, getWeather } from "../services/api";
import { contacts } from "../data/contacts";

function Home({ onSOS }) {
  const [alerts, setAlerts] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getAlerts(), getWeather()])
      .then(([a, w]) => {
        setAlerts(a.data);
        setWeather(w.data);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const count = (level) =>
    alerts.filter((a) => a.risk === level).length;

  const safe =
    weather &&
    weather.wave_height < 2.5 &&
    weather.wind_speed < 35;

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          {/* <span className="badge">
            ● Live coastal safety platform
          </span> */}

          <h1>
            Protecting our coastline with{" "}
            <span>Artificial Intelligence</span>
          </h1>

          {/* <p>
            Real-time weather, risk alerts and emergency help
            for coastal communities and fishermen.
          </p> */}

          <button
            className="btn btn-sos big"
            onClick={onSOS}
          >
            🚨 Emergency SOS
          </button>

          <a href="#alerts" className="btn btn-ghost">
            View Active Alerts
          </a>
        </div>
      </section>

      {/* BACKEND STATUS */}
      {loading && (
        <p className="message">Loading live data...</p>
      )}

      {error && (
        <p className="message">
          ⚠️ Could not reach the backend. Is FastAPI running?
        </p>
      )}

      {/* WEATHER AND EMERGENCY CONTACTS */}
      <div className="container dashboard-layout">
        {/* LIVE WEATHER - LEFT */}
        <section className="dashboard-weather" id="weather">
          <h2 className="section-title">
            🌤️ Live Weather
          </h2>

          {weather ? (
            <div className="weather-card">
              <div className="weather-main">
                <p className="muted">
                  📍 {weather.location}
                </p>

                <div className="temp">
                  {weather.temp}°C
                </div>

                <p>{weather.condition}</p>

                <span
                  className={`status ${
                    safe ? "safe" : "danger"
                  }`}
                >
                  {safe
                    ? "✅ Safe to go to sea"
                    : "⚠️ Not safe for sea travel"}
                </span>
              </div>

              <div className="weather-grid">
                <div className="mini">
                  <span>🌊</span>
                  <b>{weather.wave_height} m</b>
                  <small>Wave height</small>
                </div>

                <div className="mini">
                  <span>💨</span>
                  <b>{weather.wind_speed} km/h</b>
                  <small>Wind speed</small>
                </div>

                <div className="mini">
                  <span>💧</span>
                  <b>{weather.humidity}%</b>
                  <small>Humidity</small>
                </div>

                <div className="mini">
                  <span>👁️</span>
                  <b>{weather.visibility} km</b>
                  <small>Visibility</small>
                </div>
              </div>
            </div>
          ) : (
            <div className="weather-card">
              <p className="message">
                {loading
                  ? "Loading live weather..."
                  : "Weather data unavailable."}
              </p>
            </div>
          )}
        </section>

        {/* EMERGENCY CONTACTS - TOP RIGHT */}
        <section
          className="dashboard-emergency"
          id="contacts"
        >
          <h2 className="section-title">
            📞 Emergency Contacts
          </h2>

          <div className="contact-grid">
            {contacts.map((c) => (
              <a
                key={c.name}
                href={`tel:${c.number}`}
                className="contact"
              >
                <div className="icon">{c.icon}</div>

                <div className="contact-details">
                  <h4>{c.name}</h4>
                  <b>{c.number}</b>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* ACTIVE ALERTS */}
      {!loading && !error && (
        <section className="container block" id="alerts">
          <h2 className="section-title">
            🚨 Active Alerts for Coastal Areas
          </h2>

          <div className="stats">
            <div className="stat">
              <div className="num">{alerts.length}</div>
              <div className="label">Total Alerts</div>
            </div>

            <div className="stat high">
              <div className="num">{count("High")}</div>
              <div className="label">High Risk</div>
            </div>

            <div className="stat medium">
              <div className="num">{count("Medium")}</div>
              <div className="label">Medium Risk</div>
            </div>

            <div className="stat low">
              <div className="num">{count("Low")}</div>
              <div className="label">Low Risk</div>
            </div>
          </div>

          <div className="alert-grid">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={`alert-card ${a.risk.toLowerCase()}`}
              >
                <h4>📍 {a.location}</h4>
                <p>{a.type}</p>

                <span
                  className={`risk ${a.risk.toLowerCase()}`}
                >
                  {a.risk.toUpperCase()} RISK
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="footer">
        © 2026 Coastal Guard AI. All rights reserved.
      </footer>
    </>
  );
}

export default Home;
