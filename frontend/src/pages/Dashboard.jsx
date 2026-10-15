import { useEffect, useState } from "react";
import { getAlerts } from "../services/api";

function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAlerts()
      .then((res) => setAlerts(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const count = (level) => alerts.filter((a) => a.risk === level).length;

  return (
    <div className="container page">
      <h2>Alerts Dashboard</h2>
      <p className="subtitle">Live risk status across monitored coastal locations.</p>

      {loading && <p className="message">Loading alerts...</p>}
      {error && <p className="message">⚠️ Could not reach the backend. Is FastAPI running?</p>}

      {!loading && !error && (
        <>
          <div className="stats">
            <div className="stat"><div className="num">{alerts.length}</div><div className="label">Total Alerts</div></div>
            <div className="stat high"><div className="num">{count("High")}</div><div className="label">High Risk</div></div>
            <div className="stat medium"><div className="num">{count("Medium")}</div><div className="label">Medium Risk</div></div>
          </div>

          <div className="alert-grid">
            {alerts.map((a) => (
              <div key={a.id} className={`alert-card ${a.risk.toLowerCase()}`}>
                <h4>📍 {a.location}</h4>
                <p>{a.type}</p>
                <span className={`risk ${a.risk.toLowerCase()}`}>{a.risk.toUpperCase()} RISK</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;