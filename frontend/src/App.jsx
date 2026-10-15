import { useEffect, useState } from "react";
import { getAlerts } from "./services/api";

function App() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    getAlerts().then((res) => setAlerts(res.data));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>🌊 Coastal Guard AI</h1>
      {alerts.map((a) => (
        <div key={a.id}>
          <b>{a.location}</b>: {a.type} ({a.risk})
        </div>
      ))}
    </div>
  );
}

export default App;