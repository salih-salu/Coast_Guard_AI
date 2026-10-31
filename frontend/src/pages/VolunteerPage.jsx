import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function VolunteerPage({ onLogout, onSOS }) {
  const navigate = useNavigate();
  const [guard, setGuard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onDuty, setOnDuty] = useState(true);

  // Sample active incident tickets for the Guard
  const [incidents, setIncidents] = useState([
    { id: 101, location: "Near Light House Pier", type: "Fisherman boat engine failure", severity: "High", time: "12 mins ago", status: "Pending" },
    { id: 102, location: "North Beach Zone B", type: "Swimmers caught in rip tide", severity: "Critical", time: "25 mins ago", status: "Responding" },
    { id: 103, location: "Harbor Mouth", type: "Floating debris hazard", severity: "Low", time: "1 hr ago", status: "Resolved" },
  ]);

  // Form state for broadcasting new alert
  const [newAlert, setNewAlert] = useState({ title: "", risk: "Medium" });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (!saved) {
        navigate("/");
      } else {
        const parsed = JSON.parse(saved);
        setGuard(parsed);
      }
    } catch {
      localStorage.removeItem("user");
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  const handleStatusChange = (id, newStatus) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: newStatus } : inc))
    );
  };

  const handleBroadcast = (e) => {
    e.preventDefault();
    if (!newAlert.title) return;
    alert(`📢 ALERT BROADCASTED: "${newAlert.title}" for ${guard?.location} coastal zone.`);
    setNewAlert({ title: "", risk: "Medium" });
  };

  if (loading || !guard) {
    return (
      <div className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
        <p className="message">Loading Volunteer Command Center...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "40px 24px" }}>
      {/* 1. TOP COMMAND BANNER */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f2740 0%, #16385d 100%)",
          border: "1px solid var(--accent)",
          borderRadius: "20px",
          padding: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          marginBottom: "32px",
          boxShadow: "0 10px 30px rgba(34, 211, 238, 0.15)",
        }}
      >
        <div>
          <span className="badge" style={{ background: "rgba(34, 211, 238, 0.2)" }}>
            🛡️ Official Coastal Volunteer Desk
          </span>
          <h1 style={{ fontSize: "32px", margin: "10px 0" }}>
            Volunteer Desk: <span style={{ color: "var(--accent)" }}>{guard.name}</span>
          </h1>
          <p className="muted">
            📍 Jurisdiction: <b>{guard.location} District</b> | 📞 {guard.phone || "Active Radio Unit"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Duty Toggle */}
          <button
            onClick={() => setOnDuty(!onDuty)}
            style={{
              padding: "10px 20px",
              borderRadius: "999px",
              border: "none",
              fontWeight: 700,
              cursor: "pointer",
              background: onDuty ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
              color: onDuty ? "var(--low)" : "var(--high)",
            }}
          >
            {onDuty ? "🟢 ON DUTY" : "🔴 OFF DUTY"}
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* 2. GRID LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        
        {/* COMPONENT A: ACTIVE DISTRESS & RESCUE CALLS */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "18px", padding: "26px" }}>
          <h3 style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            🚨 Active Incidents & SOS Calls
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {incidents.map((inc) => (
              <div
                key={inc.id}
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: "12px",
                  padding: "16px",
                  borderLeft: inc.severity === "Critical" ? "4px solid var(--high)" : "4px solid var(--medium)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <b>{inc.location}</b>
                  <small className="muted">{inc.time}</small>
                </div>
                <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "10px" }}>{inc.type}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className={`risk ${inc.severity.toLowerCase()}`}>{inc.severity}</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {inc.status !== "Resolved" && (
                      <button
                        className="btn btn-primary"
                        style={{ padding: "4px 12px", fontSize: "12px" }}
                        onClick={() => handleStatusChange(inc.id, "Responding")}
                      >
                        {inc.status === "Responding" ? "In Progress" : "Dispatch"}
                      </button>
                    )}
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "4px 10px", fontSize: "12px" }}
                      onClick={() => handleStatusChange(inc.id, "Resolved")}
                    >
                      {inc.status === "Resolved" ? "✅ Closed" : "Resolve"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COMPONENT B: BROADCAST HAZARD WARNING */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "18px", padding: "26px" }}>
          <h3 style={{ marginBottom: "16px" }}>📢 Broadcast Local Beach Warning</h3>
          <p className="muted" style={{ fontSize: "14px", marginBottom: "16px" }}>
            Broadcast real-time hazard notifications directly to registered tourists and fishermen in {guard.location}.
          </p>

          <form onSubmit={handleBroadcast}>
            <input
              type="text"
              placeholder="e.g. High swells observed near lighthouse, avoid water"
              value={newAlert.title}
              onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
              required
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "12px",
                borderRadius: "10px",
                background: "var(--bg)",
                border: "1px solid var(--line)",
                color: "var(--text)",
              }}
            />
            <select
              value={newAlert.risk}
              onChange={(e) => setNewAlert({ ...newAlert, risk: e.target.value })}
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "16px",
                borderRadius: "10px",
                background: "var(--bg)",
                border: "1px solid var(--line)",
                color: "var(--text)",
              }}
            >
              <option value="Low">Low Risk Advisory</option>
              <option value="Medium">Medium Warning</option>
              <option value="High">High Danger / Red Flag</option>
            </select>

            <button className="btn btn-sos full" type="submit">
              Broadcast Alert to {guard.location}
            </button>
          </form>
        </div>

        {/* COMPONENT C: PATROL & VESSEL INSPECTION CHECKLIST */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "18px", padding: "26px" }}>
          <h3 style={{ marginBottom: "16px" }}>📋 Boat & Vessel Safety Checklist</h3>
          <p className="muted" style={{ fontSize: "14px", marginBottom: "14px" }}>
            Standard inspection items before granting harbour departure clearance:
          </p>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
            <li><label style={{ cursor: "pointer" }}><input type="checkbox" style={{ marginRight: "10px" }} /> Life jackets verified for all crew/passengers</label></li>
            <li><label style={{ cursor: "pointer" }}><input type="checkbox" style={{ marginRight: "10px" }} /> VHF Radio check with Coast Guard Station (Ch 16)</label></li>
            <li><label style={{ cursor: "pointer" }}><input type="checkbox" style={{ marginRight: "10px" }} /> Engine & Bilge pump operational</label></li>
            <li><label style={{ cursor: "pointer" }}><input type="checkbox" style={{ marginRight: "10px" }} /> Navigational lights functional</label></li>
            <li><label style={{ cursor: "pointer" }}><input type="checkbox" style={{ marginRight: "10px" }} /> Weather clearance confirmed with MET department</label></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default VolunteerPage;
