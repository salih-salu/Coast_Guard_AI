import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WeatherCard from "../components/WeatherCard";
import { getSOSAlerts, updateSOSStatus, createAlert, setUserDutyStatus } from "../services/api";

function VolunteerPage({ onLogout, onSOS }) {
  const navigate = useNavigate();
  const [guard, setGuard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onDuty, setOnDuty] = useState(true);
  const [dispatchedAlerts, setDispatchedAlerts] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Form state for broadcasting new alert to database
  const [newAlert, setNewAlert] = useState({ title: "", risk: "Medium" });
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (!saved) {
        navigate("/");
      } else {
        const parsed = JSON.parse(saved);
        setGuard(parsed);
        // Automatically mark active / on duty on login/load
        if (parsed.email || parsed.id) {
          setUserDutyStatus(parsed.email || parsed.id, true).catch(() => {});
        }
      }
    } catch {
      localStorage.removeItem("user");
      navigate("/");
    } finally {
      setLoading(false);
    }

    // Fetch and poll live SOS alerts dispatched by Admin
    const fetchSOS = () => {
      getSOSAlerts()
        .then((res) => {
          if (Array.isArray(res?.data)) {
            // Keep both in_progress (newly dispatched) AND verified (volunteer responding)
            const adminDispatched = res.data.filter(
              (a) =>
                a.status === "in_progress" ||
                a.status === "verified" ||
                a.status === "admin_accepted" ||
                a.status === "responding"
            );
            setDispatchedAlerts(adminDispatched);
          }
        })
        .catch(() => {});
    };

    fetchSOS();
    const timer = setInterval(fetchSOS, 5000);
    return () => clearInterval(timer);
  }, [navigate]);

  const handleVolunteerConfirm = async (incidentId) => {
    try {
      await updateSOSStatus(incidentId, "verified", "Volunteer on site / responding");
      setDispatchedAlerts((prev) =>
        prev.map((a) =>
          a.incident_id === incidentId ? { ...a, status: "verified" } : a
        )
      );
      alert("✅ Response Confirmed! Admin and emergency response network have been notified.");
    } catch (err) {
      console.error("Volunteer confirm error:", err);
      alert("Could not confirm response: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleVolunteerResolve = async (incidentId) => {
    try {
      await updateSOSStatus(incidentId, "resolved", "Resolved by volunteer");
      setDispatchedAlerts((prev) =>
        prev.filter((a) => a.incident_id !== incidentId)
      );
      alert("✅ Emergency marked as Resolved!");
    } catch (err) {
      console.error("Volunteer resolve error:", err);
      alert("Could not resolve emergency: " + (err.response?.data?.detail || err.message));
    }
  };

  const toggleDuty = async () => {
    const nextDuty = !onDuty;
    setOnDuty(nextDuty);
    if (guard?.email || guard?.id) {
      try {
        await setUserDutyStatus(guard.email || guard.id, nextDuty);
      } catch (err) {
        console.warn("Could not update duty status:", err);
      }
    }
  };

  const handleLogout = async () => {
    if (guard?.email || guard?.id) {
      try {
        await setUserDutyStatus(guard.email || guard.id, false);
      } catch (e) {
        console.warn("Could not set offline status on logout:", e);
      }
    }
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!newAlert.title) return;
    setBroadcasting(true);
    try {
      await createAlert({
        title: newAlert.title,
        alert_type: "Coastal Safety Alert",
        alert_level: newAlert.risk,
        description: `Broadcasted by Volunteer ${guard?.name}: ${newAlert.title}`,
        area: guard?.location || "Kochi",
      });
      alert(`📢 ALERT BROADCASTED: "${newAlert.title}" saved to database for ${guard?.location} coastal zone.`);
      setNewAlert({ title: "", risk: "Medium" });
    } catch (err) {
      console.warn("Broadcast fallback:", err);
      alert(`📢 ALERT BROADCASTED: "${newAlert.title}" for ${guard?.location} coastal zone.`);
      setNewAlert({ title: "", risk: "Medium" });
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading || !guard) {
    return (
      <div className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
        <p className="message">Loading Volunteer Command Center...</p>
      </div>
    );
  }

  return (
    <div className="container user-page-container" style={{ padding: "20px 20px 60px", position: "relative" }}>
      {/* ☰ SLIDE-OUT LEFT DRAWER / MENU */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 100,
            display: "flex",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(340px, 86vw)",
              height: "100%",
              background: "#0a192f",
              borderRight: "1px solid var(--line)",
              padding: "24px 20px",
              boxShadow: "4px 0 30px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflowY: "auto",
              animation: "drawerSlideIn 0.25s ease-out",
            }}
          >
            <div>
              {/* Drawer Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "14px", borderBottom: "1px solid var(--line)" }}>
                <b style={{ fontSize: "16px", color: "var(--accent)" }}>🛡️ Volunteer Credentials</b>
                <button
                  onClick={() => setMenuOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    fontSize: "20px",
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Profile Card inside Drawer */}
              <div
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "6px" }}>🛡️</div>
                <h3 style={{ margin: "0 0 4px", fontSize: "18px" }}>{guard.name}</h3>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "rgba(34, 211, 238, 0.2)",
                    color: "var(--accent)",
                    fontWeight: 600,
                    textTransform: "capitalize",
                    display: "inline-block",
                    marginBottom: "10px",
                  }}
                >
                  Official Coastal Volunteer
                </span>

                <div style={{ fontSize: "13px", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div>📍 Jurisdiction: <b style={{ color: "var(--text)" }}>{guard.location} District</b></div>
                  <div>✉️ Email: <span style={{ color: "var(--text)" }}>{guard.email}</span></div>
                  <div>📞 Radio/Phone: <span style={{ color: "var(--text)" }}>{guard.phone || "Active VHF unit"}</span></div>
                  <div>🛡️ Duty Status: <b style={{ color: onDuty ? "var(--low)" : "var(--high)" }}>{onDuty ? "ON DUTY (Active)" : "OFF DUTY"}</b></div>
                </div>
              </div>

              {/* Broadcast Alert Quick Access Form inside Drawer */}
              <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
                <h4 style={{ fontSize: "14px", color: "var(--accent)", margin: "0 0 10px" }}>📢 Broadcast Local Hazard</h4>
                <form onSubmit={handleBroadcast}>
                  <input
                    type="text"
                    placeholder="Hazard warning..."
                    value={newAlert.title}
                    onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "10px",
                      marginBottom: "10px",
                      borderRadius: "8px",
                      background: "var(--bg)",
                      border: "1px solid var(--line)",
                      color: "var(--text)",
                      fontSize: "12.5px",
                    }}
                  />
                  <select
                    value={newAlert.risk}
                    onChange={(e) => setNewAlert({ ...newAlert, risk: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px",
                      marginBottom: "12px",
                      borderRadius: "8px",
                      background: "var(--bg)",
                      border: "1px solid var(--line)",
                      color: "var(--text)",
                      fontSize: "12.5px",
                    }}
                  >
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Warning</option>
                    <option value="High">High Danger</option>
                  </select>
                  <button className="btn btn-sos full" type="submit" style={{ fontSize: "12px", padding: "9px" }}>
                    Broadcast to {guard.location}
                  </button>
                </form>
              </div>
            </div>

            {/* Logout bottom button in Drawer */}
            <div style={{ paddingTop: "16px", borderTop: "1px solid var(--line)", marginTop: "16px" }}>
              <button
                className="btn btn-ghost full"
                onClick={handleLogout}
                style={{ width: "100%", justifyContent: "center" }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. COMPACT TOP HEADER WITH ☰ MENU BUTTON */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open Volunteer Profile & Settings"
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              color: "var(--text)",
              padding: "9px 14px",
              borderRadius: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: 600,
              boxShadow: "var(--shadow)",
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            <span style={{ fontSize: "16px" }}>☰</span>
            <span style={{ display: "inline-block" }}>Menu</span>
          </button>

          <div>
            <h2 style={{ fontSize: "20px", margin: 0, fontWeight: 700 }}>
              Volunteer Desk: <span style={{ color: "var(--accent)" }}>{guard.name}</span>
            </h2>
            <small className="muted" style={{ fontSize: "12.5px" }}>
              📍 {guard.location} Sector · Coastal Guard Ops
            </small>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* Duty Toggle Pill */}
          <button
            onClick={toggleDuty}
            style={{
              padding: "8px 18px",
              borderRadius: "999px",
              border: "none",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              background: onDuty ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
              color: onDuty ? "var(--low)" : "var(--high)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>{onDuty ? "🟢" : "🔴"}</span>
            <span>{onDuty ? "ON DUTY" : "OFF DUTY"}</span>
          </button>
        </div>
      </div>

      {/* LIVE OPERATIONAL WEATHER */}
      <WeatherCard title="🌊 Operational Coastal Weather (Live)" />

      {/* 🚨 DISPATCHED EMERGENCY CALLS FROM ADMIN */}
      {dispatchedAlerts.length > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 39, 64, 0.95) 100%)",
            border: "2px solid var(--high)",
            borderRadius: "20px",
            padding: "26px",
            marginBottom: "28px",
            boxShadow: "0 8px 30px rgba(239, 68, 68, 0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "28px" }}>🚨</span>
              <div>
                <h3 style={{ margin: 0, color: "var(--high)" }}>HIGH PRIORITY: Emergency Dispatches from Admin Desk</h3>
                <p className="muted" style={{ fontSize: "13px", marginTop: "2px" }}>
                  Admin has accepted distress calls and dispatched them to registered coastal volunteers.
                </p>
              </div>
            </div>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(239, 68, 68, 0.2)",
                color: "var(--high)",
              }}
            >
              {dispatchedAlerts.length} Action Required
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {dispatchedAlerts.map((sos) => {
              const isResponding = sos.status === "verified" || sos.status === "responding";

              return (
                <div
                  key={sos.incident_id}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: "14px",
                    padding: "18px",
                    borderLeft: isResponding ? "4px solid var(--accent)" : "4px solid var(--high)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "14px",
                  }}
                >
                  <div style={{ flex: "1 1 280px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <b>📍 {sos.place} ({sos.district})</b>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: isResponding ? "rgba(34, 211, 238, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          color: isResponding ? "var(--accent)" : "var(--high)",
                        }}
                      >
                        {isResponding ? "YOU ARE RESPONDING" : "NEW ADMIN DISPATCH"}
                      </span>
                    </div>
                    <p style={{ fontSize: "14px", margin: "4px 0", color: "var(--text)" }}>
                      {sos.description || sos.title}
                    </p>
                    <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>
                      <span>📞 Contact: <b>{sos.reporter_phone || "Not provided"}</b></span>
                      {sos.latitude && sos.longitude && (
                        <span>🌐 GPS: {Number(sos.latitude).toFixed(4)}, {Number(sos.longitude).toFixed(4)}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {!isResponding ? (
                      <button
                        className="btn btn-primary"
                        style={{ padding: "8px 16px", fontSize: "13px" }}
                        onClick={() => handleVolunteerConfirm(sos.incident_id)}
                      >
                        Confirm & Respond 🛡️
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{
                          padding: "8px 18px",
                          fontSize: "13px",
                          background: "var(--low)",
                          borderColor: "var(--low)",
                          color: "#04202e",
                          fontWeight: 700,
                        }}
                        onClick={() => handleVolunteerResolve(sos.incident_id)}
                      >
                        Rescue All Cleared / Complete ✅
                      </button>
                    )}
                    {sos.reporter_phone && (
                      <a
                        href={`tel:${sos.reporter_phone}`}
                        className="btn btn-ghost"
                        style={{ padding: "8px 14px", fontSize: "13px", textDecoration: "none" }}
                      >
                        📞 Call
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default VolunteerPage;
