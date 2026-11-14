import { useEffect, useState } from "react";
import { getAlerts, getContacts } from "../services/api";
import { contacts as defaultContacts } from "../data/contacts";
import { getLiveWeatherByCoords, getIpLocation } from "../services/weather_api";

function Home({ onSOS }) {
  const [alerts, setAlerts] = useState([]);
  const [weather, setWeather] = useState(null);
  const [contactsList, setContactsList] = useState(defaultContacts);
  const [showAllContacts, setShowAllContacts] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(true);

  useEffect(() => {
    // 1. Fetch weather for given coordinates
    const loadWeatherForCoords = async (lat, lon) => {
      try {
        const liveWeather = await getLiveWeatherByCoords(lat, lon);
        setWeather(liveWeather);
      } catch (err) {
        console.warn("Could not fetch weather, using fallback:", err);
        setWeather({
          location: "Kochi (Kerala)",
          temp: 29,
          condition: "Partly Cloudy",
          wave_height: 1.8,
          wind_speed: 24,
          humidity: 78,
          visibility: 10,
        });
      }
    };
    // 2. GPS detection with reliable timeout and accuracy
    const requestDeviceLocation = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            console.log("GPS Position acquired:", pos.coords.latitude, pos.coords.longitude);
            setGpsEnabled(true);
            await loadWeatherForCoords(pos.coords.latitude, pos.coords.longitude);
          },
          (err) => {
            console.warn("GPS error code " + err.code + ": " + err.message);
            // Only consider disabled if user denied permission (code 1) or position unavailable
            setGpsEnabled(false);
            setWeather(null);
          },
          {
            enableHighAccuracy: false, // <-- Setting this false allows Windows Wi-Fi positioning (faster & reliable)
            timeout: 15000,            // <-- Give it 15 seconds to locate
            maximumAge: 300000,        // <-- Allow cached position up to 5 mins
          }
        );
      } else {
        setGpsEnabled(false);
        setWeather(null);
      }
    };

    requestDeviceLocation();

    // // 1. Fetch weather for given coordinates (GPS or default)
    // const loadWeatherForCoords = async (lat, lon) => {
    //   try {
    //     const liveWeather = await getLiveWeatherByCoords(lat, lon);
    //     setWeather(liveWeather);
    //   } catch (err) {
    //     console.warn("Could not fetch GPS live weather, using fallback:", err);
    //     setWeather({
    //       location: "Kochi, Kerala",
    //       temp: 29,
    //       condition: "Partly Cloudy",
    //       wave_height: 1.8,
    //       wind_speed: 24,
    //       humidity: 78,
    //       visibility: 10,
    //     });
    //   }
    // };

    // 2. Fetch Alerts and Contacts from Supabase Database
    const loadDbData = async () => {
      try {
        const [a, c] = await Promise.allSettled([getAlerts(), getContacts()]);

        // Parse Alerts
        if (a.status === "fulfilled" && Array.isArray(a.value?.data) && a.value.data.length > 0) {
          const formattedAlerts = a.value.data.map((item, idx) => ({
            id: item.alert_id || idx + 1,
            location: item.affected_district || item.area || "Kerala Coastal Area",
            risk: item.alert_level || "Medium",
            type: item.title || item.alert_type || "Weather Caution",
          }));
          setAlerts(formattedAlerts);
        } else {
          // Default fallback alerts if database table is empty
          setAlerts([
            { id: 1, location: "Marina Drive Ernakulam", risk: "High", type: "Rough waves" },
            { id: 2, location: "Kozhikode Beach", risk: "Medium", type: "Strong currents" },
            { id: 3, location: "Kollam Port", risk: "Low", type: "Minor debris" },
            { id: 4, location: "Thiruvananthapuram Coast", risk: "High", type: "High swell waves" },
          ]);
        }

        // Parse Contacts from Database
        if (c.status === "fulfilled" && Array.isArray(c.value?.data) && c.value.data.length > 0) {
          const formattedContacts = c.value.data.map((item) => ({
            name: item.organization || item.name,
            number: item.phone || item.alternate_phone,
            district: item.district || "Statewide",
            isNearest: false,
            icon: item.category === "Medical" ? "🚑" : item.category === "Police" ? "👮" : "⚓",
          }));
          setContactsList(formattedContacts);
        } else {
          // Fallback contacts with Coast Guard prioritized
          setContactsList([
            { icon: "⚓", name: "Indian Coast Guard (MRCC)", number: "1554", district: "Statewide" },
            { icon: "🚨", name: "State Coastal Control Room", number: "1077", district: "Statewide" },
            { icon: "🚑", name: "Emergency Ambulance", number: "108", district: "Statewide" },
            { icon: "👮", name: "Coastal Police Helpline", number: "1093", district: "Statewide" },
            { icon: "🔥", name: "Fire & Rescue Service", number: "101", district: "Statewide" },
            { icon: "📞", name: "National Emergency Number", number: "112", district: "Statewide" },
            { icon: "🏥", name: "District Disaster Cell", number: "0484-2423513", district: "Ernakulam" },
          ]);
        }
      } catch (err) {
        console.error("Database fetch error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadDbData();

    // 3. Safe location finder: tries browser GPS -> falls back to IP-based location immediately
    // const detectLocation = async () => {
    //   let detected = false;

    //   if ("geolocation" in navigator) {
    //     navigator.geolocation.getCurrentPosition(
    //       async (pos) => {
    //         detected = true;
    //         await loadWeatherForCoords(pos.coords.latitude, pos.coords.longitude);
    //       },
    //       async (err) => {
    //         console.warn("GPS unavailable (" + err.message + "), switching to IP location...");
    //         const ipLoc = await getIpLocation();
    //         await loadWeatherForCoords(ipLoc.lat, ipLoc.lon, ipLoc.city);
    //       },
    //       { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    //     );
    //   }

    //   // If browser doesn't prompt within 2.5s, trigger IP fallback so user never waits
    //   setTimeout(async () => {
    //     if (!detected && !weather) {
    //       const ipLoc = await getIpLocation();
    //       loadWeatherForCoords(ipLoc.lat, ipLoc.lon, ipLoc.city);
    //     }
    //   }, 2500);
    // };

    // detectLocation();
  }, []);

  // Helper to count alerts by risk category safely
  const count = (level) =>
    (alerts || []).filter(
      (a) => (a?.risk || "").toLowerCase() === (level || "").toLowerCase()
    ).length;

  // Sea safety condition check
  const safe =
    weather &&
    Number(weather.wave_height || 0) < 2.5 &&
    Number(weather.wind_speed || 0) < 35;

  return (
    <>
      {/* HERO SECTION */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>
              Navigating Risk.
              <br />
              <span>Delivering Safety</span>
            </h1>

            <div className="hero-actions">
              <button className="btn btn-sos big" onClick={onSOS}>
                🚨 Emergency SOS
              </button>
              <a href="#alerts" className="btn btn-ghost">
                View Active Alerts
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* STATUS NOTICES */}
      {loading && <p className="message">Loading coastal telemetry…</p>}

      {error && (
        <p className="message error-message">
          ⚠️ Could not reach backend. Using cached local coastal data.
        </p>
      )}


      {/* DASHBOARD: LIVE WEATHER + CONTACTS */}
      <div className="container dashboard-layout">
        {/* LIVE GPS WEATHER SECTION */}
        <section className="dashboard-weather" id="weather">
          <div className="section-header">
            <h2 className="section-title">🌤️ Live Weather</h2>
          </div>

          {/* IF GPS IS OFF: Show Turn On Location Card */}
          {!gpsEnabled ? (
            <div
              className="weather-card"
              style={{
                textAlign: "center",
                padding: "36px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--card)",
                border: "1px dashed var(--line)",
                borderRadius: "16px",
              }}
            >
              <div style={{ fontSize: "36px", marginBottom: "10px" }}>📡</div>
              <h3 style={{ fontSize: "18px", marginBottom: "6px" }}>Location is Turned Off</h3>
              <p className="muted" style={{ fontSize: "14px", maxWidth: "340px", margin: "0 auto 16px" }}>
                Please turn on your device GPS / allow location access to view real-time coastal weather and sea condition alerts.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  navigator.geolocation?.getCurrentPosition(
                    async (pos) => {
                      setGpsEnabled(true);
                      await loadWeatherForCoords(pos.coords.latitude, pos.coords.longitude);
                    },
                    (err) => {
                      alert("Location error: " + err.message + ". Please allow location in your browser address bar.");
                    },
                    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
                  );
                }}
              >
                Turn On Location 📍
              </button>
            </div>
          ) : weather ? (
            /* IF GPS IS ON: Show Complete Weather Details */
            <div className="weather-card">
              <div className="weather-main">
                <p className="location">📍 {weather.location}</p>
                <div className="temp">{weather.temp}°C</div>
                <p className="condition">{weather.condition}</p>

                <span className={`status ${safe ? "safe" : "danger"}`}>
                  {safe ? "✅ Safe to go to sea" : "⚠️ Not safe for sea travel"}
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

        {/* EMERGENCY CONTACTS */}
        <section className="dashboard-emergency" id="contacts">
          <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="section-title">📞 Emergency Contacts</h2>
            {contactsList.length > 5 && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: "13px", padding: "4px 12px", border: "1px solid var(--line)" }}
                onClick={() => setShowAllContacts(!showAllContacts)}
              >
                {showAllContacts ? "Show Less ▲" : `See More (${contactsList.length - 5}) ▼`}
              </button>
            )}
          </div>

          <div className="contact-grid">
            {/* Slice only first 5 unless showAllContacts is true */}
            {(showAllContacts ? contactsList : contactsList.slice(0, 5)).map((c, i) => (
              <a key={(c.name || "contact") + i} href={`tel:${c.number}`} className="contact">
                <div className="icon">{c.icon || "📞"}</div>
                <div className="contact-details">
                  <h4>{c.name}</h4>
                  <b>{c.number}</b>
                  {c.district && c.district !== "Statewide" && (
                    <small style={{ color: "var(--accent)", fontSize: "11px", display: "block" }}>
                      📍 {c.district}
                    </small>
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>

      {/* ACTIVE ALERTS LIST */}
      {!loading && (
        <section className="container block" id="alerts">
          <div
            className="section-header"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}
          >
            <h2 className="section-title" style={{ margin: 0 }}>🚨 Active Alerts for Coastal Areas</h2>
            {alerts.length > 6 && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: "13px", padding: "6px 14px", border: "1px solid var(--line)" }}
                onClick={() => setShowAllAlerts(!showAllAlerts)}
              >
                {showAllAlerts ? "Show Less ▲" : `Show More (${alerts.length - 6}) ▼`}
              </button>
            )}
          </div>

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

          <div
            className="alert-grid"
            style={{
              maxHeight: showAllAlerts ? "none" : "360px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {alerts.map((a) => {
              const riskKey = (a.risk || "medium").toLowerCase();
              return (
                <div key={a.id} className={`alert-card ${riskKey}`}>
                  <div className="alert-top">
                    <h4>📍 {a.location}</h4>
                    <span className={`risk ${riskKey}`}>
                      {(a.risk || "MEDIUM").toUpperCase()}
                    </span>
                  </div>
                  <p>{a.type}</p>
                </div>
              );
            })}
          </div>

          {alerts.length > 6 && !showAllAlerts && (
            <div style={{ textAlign: "center", marginTop: "14px" }}>
              <button
                className="btn btn-ghost"
                style={{ fontSize: "13px", padding: "6px 16px", border: "1px solid var(--line)", borderRadius: "999px" }}
                onClick={() => setShowAllAlerts(true)}
              >
                Show All {alerts.length} Alerts ▼
              </button>
            </div>
          )}
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