import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getLiveWeatherByCoords } from "../services/weather_api";
import { getAlerts, getContacts } from "../services/api";
import { contacts as defaultContacts } from "../data/contacts";
import WeatherCard from "../components/WeatherCard";



function UserPage({ onLogout, onSOS }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [weather, setWeather] = useState(null);
  const [contactsList, setContactsList] = useState(defaultContacts);
  const [localAlerts, setLocalAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Authenticate cached user
    try {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) {
        navigate("/");
        return;
      }
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
    } catch {
      localStorage.removeItem("user");
      navigate("/");
      return;
    }

    // 2. Load alerts and contacts (Weather is handled by WeatherCard component)
    const loadDashboardData = async () => {
      try {
        const [aRes, cRes] = await Promise.allSettled([getAlerts(), getContacts()]);

        if (aRes.status === "fulfilled" && Array.isArray(aRes.value?.data)) {
          setLocalAlerts(aRes.value.data.slice(0, 3));
        }

        if (cRes.status === "fulfilled" && Array.isArray(cRes.value?.data) && cRes.value.data.length > 0) {
          const mapped = cRes.value.data.map((c) => ({
            name: c.organization || c.name,
            number: c.phone || c.alternate_phone,
            icon: c.category === "Medical" ? "🚑" : c.category === "Police" ? "👮" : "⚓",
          }));
          setContactsList(mapped);
        }
      } catch (err) {
        console.warn("User dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [navigate]);

  const handleLogout = () => {
    if (onLogout) onLogout();
    else {
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  if (loading || !user) {
    return (
      <div className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
        <p className="message">Loading your coastal safety dashboard...</p>
      </div>
    );
  }

  const isFisherman = (user.user_type || "").toLowerCase() === "fisherman";
  const safe = weather && Number(weather.wave_height || 0) < 2.5 && Number(weather.wind_speed || 0) < 35;

  return (
    <div className="container" style={{ padding: "40px 24px" }}>
      {/* 1. TOP PROFILE & WELCOME BANNER */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: "20px",
          padding: "30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          marginBottom: "32px",
          boxShadow: "var(--shadow)",
        }}
      >
        <div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span className="badge">👤 Citizen Portal</span>
            <span
              style={{
                fontSize: "12px",
                padding: "2px 10px",
                borderRadius: "999px",
                background: isFisherman ? "#0284c7" : "#0d9488",
                color: "#ffffff",
                fontWeight: 600,
                textTransform: "capitalize",
              }}
            >
              {isFisherman ? "🎣 Registered Fisherman" : "🏠 Coastal Resident"}
            </span>
          </div>

          <h1 style={{ fontSize: "28px", margin: "12px 0 6px" }}>
            Welcome back, <span style={{ color: "var(--accent)" }}>{user.name || user.full_name}</span>!
          </h1>
          <p className="muted" style={{ fontSize: "14px" }}>
            📍 District: <b>{user.location || "Kerala Coast"}</b> | ✉️ {user.email} | 📞 {user.phone || "Not set"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="btn btn-sos" onClick={onSOS}>
            🚨 Emergency SOS
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* 2. LIVE MARINE WEATHER + LIVELIHOOD ADVISORY */}
      <div className="dashboard-layout" style={{ marginBottom: "36px" }}>
        {/* Reusable WeatherCard with exact live GPS & Kerala telemetry */}
        <WeatherCard title="🌤️ Real-Time Marine Telemetry" />

        {/* Tailored Safety Precautions based on User Type */}
        <section className="dashboard-emergency">
          <div className="section-header">
            <h2 className="section-title">
              {isFisherman ? "⚓ Seafarer Safety Guidelines" : "🛡️ Coastal Resident Precautions"}
            </h2>
          </div>

          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "22px",
              height: "calc(100% - 44px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <ul style={{ paddingLeft: "20px", color: "var(--muted)", lineHeight: "1.9", fontSize: "14px" }}>
              {isFisherman ? (
                <>
                  <li>Always keep VHF marine radio tuned to Channel 16.</li>
                  <li>Check wave heights before crossing harbour mouths & bars.</li>
                  <li>Ensure DAT (Distress Alert Transmitters) and lifejackets are onboard.</li>
                  <li>Do not venture beyond 12 nautical miles during red/orange surge alerts.</li>
                </>
              ) : (
                <>
                  <li>Keep important documents in waterproof bags during monsoon surge.</li>
                  <li>Identify your nearest designated cyclone / flood relief shelter.</li>
                  <li>Stay clear of shorelines, groynes, and breakwaters during high tide.</li>
                  <li>Report tidal flooding or breached sea walls to the local ward member.</li>
                </>
              )}
            </ul>

            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
              <small className="muted">
                Need immediate coast assistance? Call MRCC toll-free at <b>1554</b>.
              </small>
            </div>
          </div>
        </section>
      </div>

      {/* 3. EMERGENCY CONTACTS GRID */}
      <section style={{ marginBottom: "36px" }}>
        <div className="section-header">
          <h2 className="section-title">📞 Quick Emergency Lines</h2>
        </div>

        <div className="contact-grid">
          {contactsList.slice(0, 5).map((c, i) => (
            <a key={(c.name || "contact") + i} href={`tel:${c.number}`} className="contact">
              <div className="icon">{c.icon || "📞"}</div>
              <div className="contact-details">
                <h4>{c.name}</h4>
                <b>{c.number}</b>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* 4. ACTIVE LOCAL ALERTS */}
      <section>
        <div className="section-header">
          <h2 className="section-title">🚨 Recent Coastal Advisories</h2>
        </div>

        {localAlerts.length > 0 ? (
          <div className="alert-grid">
            {localAlerts.map((a) => {
              const riskKey = (a.alert_level || a.risk || "medium").toLowerCase();
              return (
                <div key={a.alert_id || a.id} className={`alert-card ${riskKey}`}>
                  <div className="alert-top">
                    <h4>📍 {a.affected_district || a.location || "Coastal Kerala"}</h4>
                    <span className={`risk ${riskKey}`}>
                      {(a.alert_level || a.risk || "MEDIUM").toUpperCase()}
                    </span>
                  </div>
                  <p>{a.title || a.type || a.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: "var(--card)", padding: "20px", borderRadius: "12px", border: "1px solid var(--line)" }}>
            <p className="muted" style={{ margin: 0 }}>
              ✅ No critical coastal alerts currently issued for your region. Sea conditions are under normal limits.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default UserPage;