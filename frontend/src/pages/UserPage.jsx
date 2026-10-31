import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function UserPage({ onLogout, onSOS }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) {
        navigate("/");
      } else {
        setUser(JSON.parse(savedUser));
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


  // Show loading message instead of a blank screen
  if (loading || !user) {
    return (
      <div className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
        <p className="message">Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "40px 24px" }}>
      {/* Top Profile Banner */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: "20px",
          padding: "32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        <div>
          <span className="badge">👤 User Dashboard</span>
          <h1 style={{ fontSize: "32px", margin: "10px 0" }}>
            Welcome back, <span style={{ color: "var(--accent)" }}>{user.name}</span>!
          </h1>
          <p className="muted">
            📍 Registered District: <b>{user.location}</b> | ✉️ {user.email}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn-sos" onClick={onSOS}>
            🚨 Emergency SOS
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Localized Coastal Safety Cards */}
      <h2 className="section-title">Coastal Updates for {user.location}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        <div className="alert-card low" style={{ background: "var(--card)", padding: "24px", borderRadius: "16px" }}>
          <h4>Sea Conditions</h4>
          <p>Normal conditions reported for {user.location} coastal zone.</p>
          <span className="risk low">SAFE FOR VISITORS</span>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", padding: "24px", borderRadius: "16px" }}>
          <h4>Personal Safety Reminders</h4>
          <ul style={{ paddingLeft: "20px", color: "var(--muted)", marginTop: "10px", lineHeight: "1.8" }}>
            <li>Avoid swimming during high tide warnings.</li>
            <li>Follow lifeguard flags on {user.location} beaches.</li>
            <li>Keep emergency numbers on speed dial.</li>
          </ul>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", padding: "24px", borderRadius: "16px" }}>
          <h4>Local Coastal Guard Desk</h4>
          <p className="muted" style={{ margin: "10px 0" }}>Direct line for maritime assistance in your district.</p>
          <b style={{ fontSize: "20px", color: "var(--accent)" }}>7736596093 (Coast Guard)</b>
        </div>
      </div>
    </div>
  );
}

export default UserPage;
