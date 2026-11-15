import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getSOSAlerts, updateSOSStatus } from "../services/api";


function AdminPage({ onLogout, onSOS }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [filterRole, setFilterRole] = useState("All");
  const [loading, setLoading] = useState(true);
  const [dispatchingId, setDispatchingId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // Sample District Threat Statuses
  const districtThreats = [
    { district: "Ernakulam (Kochi)", risk: "Normal", waves: "1.4m", status: "Safe" },
    { district: "Kozhikode (Beach)", risk: "Medium", waves: "2.1m", status: "Caution" },
    { district: "Thiruvananthapuram", risk: "High", waves: "2.9m", status: "Red Alert" },
    { district: "Alappuzha", risk: "Normal", waves: "1.2m", status: "Safe" },
    { district: "Kollam", risk: "Low", waves: "1.1m", status: "Safe" },
    { district: "Kannur", risk: "Medium", waves: "2.0m", status: "Caution" },
  ];
  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (!saved) {
        navigate("/");
        return;
      }
      const parsed = JSON.parse(saved);
      if ((parsed.role || "").toLowerCase() !== "admin") {
        navigate("/");
        return;
      }
      setAdmin(parsed);
      // Fetch registered users & active SOS alerts from backend
      Promise.allSettled([
        api.get("/users"),
        getSOSAlerts(),
      ])
        .then(([usersRes, sosRes]) => {
          if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value?.data)) {
            setUsers(usersRes.value.data);
          }
          if (sosRes.status === "fulfilled" && Array.isArray(sosRes.value?.data)) {
            setSosAlerts(sosRes.value.data);
          }
        })
        .finally(() => setLoading(false));

      // Poll for fresh SOS alerts & volunteer duty statuses every 4 seconds
      const pollTimer = setInterval(() => {
        getSOSAlerts()
          .then((res) => {
            if (Array.isArray(res?.data)) setSosAlerts(res.data);
          })
          .catch(() => {});

        api.get("/users")
          .then((res) => {
            if (Array.isArray(res?.data)) setUsers(res.data);
          })
          .catch(() => {});
      }, 4000);

      return () => clearInterval(pollTimer);
    } catch {
      navigate("/");
    }
  }, [navigate]);

  const handleAcceptSOS = async (incidentId) => {
    setDispatchingId(incidentId);
    try {
      await updateSOSStatus(incidentId, "in_progress", "Dispatched to coastal volunteers");
      setSosAlerts((prev) =>
        prev.map((alert) =>
          alert.incident_id === incidentId
            ? { ...alert, status: "in_progress" }
            : alert
        )
      );
      alert("🚨 SOS Accepted! Notification dispatched to all registered Coastal Volunteers.");
    } catch (err) {
      console.error("SOS status update failed:", err);
      alert("Could not update SOS status: " + (err.response?.data?.detail || err.message));
    } finally {
      setDispatchingId(null);
    }
  };
  const handleLogout = () => {
    if (onLogout) onLogout();
    else {
      localStorage.removeItem("user");
      navigate("/");
    }
  };
  const volunteers = users.filter((u) =>
    ["volunteer", "guide", "lifeguard", "coastal_guard"].includes((u.role || "").toLowerCase())
  );

  const regularUsers = users.filter(
    (u) => !["volunteer", "guide", "lifeguard", "coastal_guard"].includes((u.role || "").toLowerCase())
  );
  if (loading || !admin) {
    return (
      <div className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
        <p className="message">Authenticating Admin Command Center...</p>
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
              background: "#0d1b2a",
              borderRight: "1px solid #818cf8",
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
                <b style={{ fontSize: "16px", color: "#a5b4fc" }}>⚡ Admin Command Desk</b>
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
                  border: "1px solid #818cf8",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "20px",
                }}
              >
                <div style={{ fontSize: "36px", marginBottom: "6px" }}>⚡</div>
                <h3 style={{ margin: "0 0 4px", fontSize: "18px", color: "#a5b4fc" }}>{admin.name}</h3>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "rgba(129, 140, 248, 0.2)",
                    color: "#a5b4fc",
                    fontWeight: 600,
                    textTransform: "capitalize",
                    display: "inline-block",
                    marginBottom: "10px",
                  }}
                >
                  Super Admin · State HQ
                </span>

                <div style={{ fontSize: "13px", color: "var(--muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div>📍 Jurisdiction: <b style={{ color: "var(--text)" }}>{admin.location}</b></div>
                  <div>✉️ Email: <span style={{ color: "var(--text)" }}>{admin.email}</span></div>
                  <div>📞 Hotline: <span style={{ color: "var(--text)" }}>{admin.phone || "Command Radio"}</span></div>
                  <div>🛡️ Access Level: <b style={{ color: "var(--low)" }}>Full Clearance</b></div>
                </div>
              </div>

              {/* Operational Quick Stats in Drawer */}
              <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "14px", padding: "16px", marginBottom: "16px" }}>
                <h4 style={{ fontSize: "14px", color: "var(--accent)", margin: "0 0 10px" }}>📊 Quick Telemetry</h4>
                <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="muted">Total Users:</span>
                    <b>{users.length}</b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="muted">Volunteers:</span>
                    <b style={{ color: "var(--low)" }}>
                      {users.filter((u) => (u.role || "").toLowerCase() === "volunteer").length}
                    </b>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="muted">Active SOS Tickets:</span>
                    <b style={{ color: sosAlerts.length > 0 ? "var(--high)" : "var(--low)" }}>
                      {sosAlerts.length}
                    </b>
                  </div>
                </div>
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
            aria-label="Open Admin Profile & Options Menu"
            style={{
              background: "var(--card)",
              border: "1px solid #818cf8",
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
              State Maritime Desk: <span style={{ color: "#a5b4fc" }}>{admin.name}</span>
            </h2>
            <small className="muted" style={{ fontSize: "12.5px" }}>
              📍 {admin.location} · Super Admin Command Center
            </small>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span
            style={{
              padding: "6px 14px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 700,
              background: sosAlerts.length > 0 ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
              color: sosAlerts.length > 0 ? "var(--high)" : "var(--low)",
            }}
          >
            {sosAlerts.length} Active SOS
          </span>
        </div>
      </div>

      {/* 🚨 INCOMING EMERGENCY SOS DESK */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "20px", padding: "28px", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>🚨</span>
            <div>
              <h3 style={{ margin: 0 }}>Incoming Emergency SOS Distress Calls</h3>
              <p className="muted" style={{ fontSize: "13px", marginTop: "2px" }}>
                Live distress beacon calls from citizens and seafarers along Kerala coast.
              </p>
            </div>
          </div>
          <span
            style={{
              padding: "4px 14px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 700,
              background: sosAlerts.length > 0 ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
              color: sosAlerts.length > 0 ? "var(--high)" : "var(--low)",
            }}
          >
            {sosAlerts.length} Active Distress Ticket(s)
          </span>
        </div>

        {sosAlerts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", background: "var(--bg)", borderRadius: "14px", border: "1px dashed var(--line)" }}>
            <p className="muted">🟢 All coastal sectors quiet. No pending SOS emergency distress calls.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {sosAlerts.map((sos) => {
              const isDispatched = sos.status === "in_progress";
              const isVolunteerConfirmed = sos.status === "verified";
              const isResolved = sos.status === "resolved";

              return (
                <div
                  key={sos.incident_id}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    borderRadius: "14px",
                    padding: "18px",
                    borderLeft: isResolved
                      ? "4px solid var(--low)"
                      : isVolunteerConfirmed
                      ? "4px solid #38bdf8"
                      : isDispatched
                      ? "4px solid var(--medium)"
                      : "4px solid var(--high)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px",
                  }}
                >
                  <div style={{ flex: "1 1 300px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <b>📍 {sos.place} ({sos.district})</b>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: isResolved
                            ? "rgba(34, 197, 94, 0.2)"
                            : isVolunteerConfirmed
                            ? "rgba(56, 189, 248, 0.2)"
                            : isDispatched
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(239, 68, 68, 0.2)",
                          color: isResolved
                            ? "var(--low)"
                            : isVolunteerConfirmed
                            ? "#38bdf8"
                            : isDispatched
                            ? "var(--medium)"
                            : "var(--high)",
                        }}
                      >
                        {isResolved
                          ? "✅ RESCUE ALL CLEARED"
                          : isVolunteerConfirmed
                          ? "🤝 VOLUNTEER RESPONDING ON SITE"
                          : isDispatched
                          ? "⏳ WAITING FOR VOLUNTEER CONFIRMATION"
                          : "🚨 PENDING ADMIN DISPATCH"}
                      </span>
                    </div>
                    <p style={{ fontSize: "14px", color: "var(--text)", margin: "4px 0" }}>
                      {sos.description || sos.title}
                    </p>
                    <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--muted)", marginTop: "6px" }}>
                      <span>📞 Caller: <b>{sos.reporter_phone || "Not provided"}</b></span>
                      {sos.latitude && sos.longitude && (
                        <span>🌐 GPS: {Number(sos.latitude).toFixed(4)}, {Number(sos.longitude).toFixed(4)}</span>
                      )}
                      <span>🕒 Reported: {new Date(sos.reported_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    {/* Case 1: Brand new SOS -> Admin must dispatch */}
                    {!isDispatched && !isVolunteerConfirmed && !isResolved && (
                      <button
                        className="btn btn-sos"
                        style={{ padding: "8px 16px", fontSize: "13px" }}
                        onClick={() => handleAcceptSOS(sos.incident_id)}
                        disabled={dispatchingId === sos.incident_id}
                      >
                        {dispatchingId === sos.incident_id ? "Dispatching..." : "Accept & Dispatch Volunteers 📢"}
                      </button>
                    )}

                    {/* Case 2: Dispatched by Admin, awaiting Volunteer response */}
                    {isDispatched && !isVolunteerConfirmed && !isResolved && (
                      <span
                        style={{
                          fontSize: "13px",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "var(--medium)",
                          fontWeight: 600,
                          border: "1px dashed var(--medium)",
                        }}
                      >
                        ⏳ Waiting for volunteer to accept & complete needs...
                      </span>
                    )}

                    {/* Case 3: Volunteer has accepted and confirmed response */}
                    {isVolunteerConfirmed && !isResolved && (
                      <span
                        style={{
                          fontSize: "13px",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          background: "rgba(56, 189, 248, 0.15)",
                          color: "#38bdf8",
                          fontWeight: 600,
                          border: "1px solid #38bdf8",
                        }}
                      >
                        🤝 Volunteer Confirmed & Assisting on Site
                      </span>
                    )}

                    {/* Case 4: Emergency is completely resolved */}
                    {isResolved && (
                      <span
                        style={{
                          fontSize: "13px",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          background: "rgba(34, 197, 94, 0.15)",
                          color: "var(--low)",
                          fontWeight: 600,
                          border: "1px solid var(--low)",
                        }}
                      >
                        ✅ Rescue all cleared
                      </span>
                    )}

                    {sos.reporter_phone && (
                      <a
                        href={`tel:${sos.reporter_phone}`}
                        className="btn btn-ghost"
                        style={{ padding: "8px 14px", fontSize: "13px", textDecoration: "none" }}
                      >
                        📞 Call Caller
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. KPI ANALYTICS CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "32px" }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", padding: "20px", borderRadius: "16px" }}>
          <p className="muted">Total Registered Accounts</p>
          <h2 style={{ fontSize: "36px", color: "var(--accent)", marginTop: "8px" }}>{users.length}</h2>
          <small className="muted">Stored in users.xlsx</small>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", padding: "20px", borderRadius: "16px" }}>
          <p className="muted">Active Coastal Volunteers</p>
          <h2 style={{ fontSize: "36px", color: "var(--low)", marginTop: "8px" }}>
            {users.filter((u) => (u.role || "").toLowerCase() === "volunteer" || (u.role || "").toLowerCase() === "guide").length}
          </h2>
          <small className="muted">Across Kerala coastal hubs</small>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", padding: "20px", borderRadius: "16px" }}>
          <p className="muted">Active High Alert Zones</p>
          <h2 style={{ fontSize: "36px", color: "var(--high)", marginTop: "8px" }}>1</h2>
          <small className="muted">Trivandrum South Coast</small>
        </div>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", padding: "20px", borderRadius: "16px" }}>
          <p className="muted">AI Forecasting Core</p>
          <h2 style={{ fontSize: "28px", color: "#38bdf8", marginTop: "12px" }}>ONLINE</h2>
          <small className="muted">Open-Meteo & Wave Models active</small>
        </div>
      </div>
      {/* 4. DISTRICT COASTAL THREAT MATRIX */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "20px", padding: "28px", marginBottom: "32px" }}>
        <h3 style={{ marginBottom: "18px" }}>🌊 Kerala Coastal Threat Matrix</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {districtThreats.map((d, idx) => (
            <div
              key={idx}
              style={{
                background: "var(--bg)",
                border: "1px solid var(--line)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <b>{d.district}</b>
                <p className="muted" style={{ fontSize: "13px", marginTop: "4px" }}>Wave Height: {d.waves}</p>
              </div>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: d.status === "Red Alert" ? "rgba(239, 68, 68, 0.2)" : d.status === "Caution" ? "rgba(245, 158, 11, 0.2)" : "rgba(34, 197, 94, 0.2)",
                  color: d.status === "Red Alert" ? "var(--high)" : d.status === "Caution" ? "var(--medium)" : "var(--low)",
                }}
              >
                {d.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. COASTAL VOLUNTEERS & LIFEGUARDS (DEDICATED SECTION) */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid rgba(34, 211, 238, 0.3)",
          borderRadius: "20px",
          padding: "28px",
          marginBottom: "32px",
          boxShadow: "0 4px 24px rgba(34, 211, 238, 0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>🦺</span>
            <div>
              <h3 style={{ margin: 0, color: "var(--accent)" }}>Coastal Volunteers & Rescue Force</h3>
              <p className="muted" style={{ fontSize: "13px", marginTop: "2px" }}>
                Dedicated monitoring of active volunteer responders, duty status, and district assignment.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(34, 197, 94, 0.15)",
                color: "#22c55e",
                border: "1px solid rgba(34, 197, 94, 0.3)",
              }}
            >
              🟢 {volunteers.filter((v) => v.on_duty).length} On Duty
            </span>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              🔴 {volunteers.filter((v) => !v.on_duty).length} Off Duty
            </span>
          </div>
        </div>

        {volunteers.length === 0 ? (
          <p className="muted" style={{ textAlign: "center", padding: "30px" }}>
            No registered coastal volunteers found.
          </p>
        ) : (
          <div style={{ overflowX: "auto", maxHeight: "420px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--card)", zIndex: 2 }}>
                <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                  <th style={{ padding: "12px" }}>#</th>
                  <th style={{ padding: "12px" }}>Volunteer Name</th>
                  <th style={{ padding: "12px" }}>Role</th>
                  <th style={{ padding: "12px" }}>Duty Status</th>
                  <th style={{ padding: "12px" }}>Assigned District</th>
                  <th style={{ padding: "12px" }}>Email</th>
                  <th style={{ padding: "12px" }}>Emergency Phone</th>
                  <th style={{ padding: "12px" }}>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map((u, i) => {
                  const isOnDuty = Boolean(u.on_duty);
                  return (
                    <tr key={u.id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "12px" }}>{u.id}</td>
                      <td style={{ padding: "12px", fontWeight: 600, color: "var(--text)" }}>{u.name}</td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: "rgba(34, 211, 238, 0.15)",
                            color: "var(--accent)",
                          }}
                        >
                          {u.role || "Volunteer"}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 10px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 800,
                            letterSpacing: "0.5px",
                            background: isOnDuty ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: isOnDuty ? "#22c55e" : "#ef4444",
                            border: isOnDuty ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                          }}
                        >
                          <span>{isOnDuty ? "🟢" : "🔴"}</span>
                          <span>{isOnDuty ? "ON DUTY" : "OFF DUTY"}</span>
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>📍 {u.location}</td>
                      <td style={{ padding: "12px", color: "var(--muted)" }}>{u.email}</td>
                      <td style={{ padding: "12px", color: "var(--muted)" }}>{u.phone}</td>
                      <td style={{ padding: "12px", color: "var(--muted)" }}>{u.registered_at}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. REGISTERED CITIZENS & SEAFARERS TABLE */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "20px", padding: "28px", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 style={{ margin: 0 }}>📋 Registered Citizen Accounts</h3>
            <p className="muted" style={{ fontSize: "13px", marginTop: "2px" }}>
              Coastal residents, tourists, and registered fishermen accounts.
            </p>
          </div>
          <span
            style={{
              padding: "4px 12px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: 700,
              background: "rgba(255, 255, 255, 0.1)",
              color: "var(--text)",
            }}
          >
            {regularUsers.length} Users
          </span>
        </div>

        {regularUsers.length === 0 ? (
          <p className="muted" style={{ textAlign: "center", padding: "30px" }}>No registered citizen accounts found.</p>
        ) : (
          <div style={{ overflowX: "auto", maxHeight: "420px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--card)", zIndex: 2 }}>
                <tr style={{ borderBottom: "1px solid var(--line)", color: "var(--muted)" }}>
                  <th style={{ padding: "12px" }}>#</th>
                  <th style={{ padding: "12px" }}>Full Name</th>
                  <th style={{ padding: "12px" }}>Role</th>
                  <th style={{ padding: "12px" }}>District</th>
                  <th style={{ padding: "12px" }}>Email</th>
                  <th style={{ padding: "12px" }}>Phone</th>
                  <th style={{ padding: "12px" }}>Registered Date</th>
                </tr>
              </thead>
              <tbody>
                {regularUsers.map((u, i) => (
                  <tr key={u.id || i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px" }}>{u.id}</td>
                    <td style={{ padding: "12px", fontWeight: 600 }}>{u.name}</td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 700,
                          background: "rgba(255, 255, 255, 0.1)",
                          color: "var(--text)",
                          textTransform: "capitalize",
                        }}
                      >
                        {u.role || "Citizen"}
                      </span>
                    </td>
                    <td style={{ padding: "12px" }}>📍 {u.location}</td>
                    <td style={{ padding: "12px", color: "var(--muted)" }}>{u.email}</td>
                    <td style={{ padding: "12px", color: "var(--muted)" }}>{u.phone}</td>
                    <td style={{ padding: "12px", color: "var(--muted)" }}>{u.registered_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
export default AdminPage;
