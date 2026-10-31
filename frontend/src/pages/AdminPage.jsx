import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
function AdminPage({ onLogout, onSOS }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState("All");
  const [loading, setLoading] = useState(true);
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
      // Fetch all registered users from backend Excel
      axios.get("http://192.168.1.27:8000/api/admin/users")
        .then((res) => setUsers(res.data))
        .catch(() => setUsers([]))
        .finally(() => setLoading(false));
    } catch {
      navigate("/");
    }
  }, [navigate]);
  const handleLogout = () => {
    if (onLogout) onLogout();
    else {
      localStorage.removeItem("user");
      navigate("/");
    }
  };
  const filteredUsers = filterRole === "All"
    ? users
    : users.filter((u) => (u.role || "").toLowerCase() === filterRole.toLowerCase());
  if (loading || !admin) {
    return (
      <div className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
        <p className="message">Authenticating Admin Command Center...</p>
      </div>
    );
  }
  return (
    <div className="container" style={{ padding: "40px 24px" }}>
      {/* 1. TOP ADMIN BANNER */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #0f2740 100%)",
          border: "1px solid #818cf8",
          borderRadius: "20px",
          padding: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          marginBottom: "32px",
          boxShadow: "0 10px 30px rgba(99, 102, 241, 0.2)",
        }}
      >
        <div>
          <span className="badge" style={{ background: "rgba(129, 140, 248, 0.2)", color: "#a5b4fc" }}>
            ⚡ Super Admin Control Center
          </span>
          <h1 style={{ fontSize: "32px", margin: "10px 0" }}>
            State Maritime Desk: <span style={{ color: "#a5b4fc" }}>{admin.name}</span>
          </h1>
          <p className="muted">
            📍 Jurisdiction: <b>{admin.location}</b> | Access Level: <b>Full Clearance</b>
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-sos" onClick={onSOS}>
            🚨 Emergency Broadcast
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
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
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "20px", padding: "28px", marginBottom: "32px"}}>
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

      {/* 3. REGISTERED USERS MANAGEMENT TABLE */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "20px", padding: "28px", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <h3>📋 Registered Accounts (users.xlsx)</h3>
          
          {/* Role Filter */}
          <div style={{ display: "flex", gap: "8px" }}>
            {["All", "User", "Volunteer"].map((role) => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "999px",
                  border: "1px solid var(--line)",
                  background: filterRole === role ? "var(--accent)" : "transparent",
                  color: filterRole === role ? "#04202e" : "var(--text)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
        {filteredUsers.length === 0 ? (
          <p className="muted" style={{ textAlign: "center", padding: "30px" }}>No accounts found in this category.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
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
                {filteredUsers.map((u, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px" }}>{u.id}</td>
                    <td style={{ padding: "12px", fontWeight: 600 }}>{u.name}</td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: 700,
                          background: ["volunteer", "guide"].includes((u.role || "").toLowerCase()) ? "rgba(34, 211, 238, 0.15)" : "rgba(255, 255, 255, 0.1)",
                          color: ["volunteer", "guide"].includes((u.role || "").toLowerCase()) ? "var(--accent)" : "var(--text)",
                        }}
                      >
                        {u.role}
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
