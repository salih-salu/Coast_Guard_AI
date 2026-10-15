import { Link } from "react-router-dom";

const features = [
  { icon: "📡", title: "Real-Time Monitoring", text: "Track wave height, wind and weather conditions along the coastline." },
  { icon: "🤖", title: "AI Risk Prediction", text: "Machine learning models predict dangers before they become emergencies." },
  { icon: "🚨", title: "Instant Alerts", text: "Get clear High, Medium and Low risk alerts for every location." },
];

function Home() {
  return (
    <>
      <section className="hero">
        <div className="container">
          <span className="badge">● Live coastal safety platform</span>
          <h1>Protecting our coastline with <span>Artificial Intelligence</span></h1>
          <p>Coastal Guard AI watches the sea so you don't have to. Detect risks early and keep coastal communities safe.</p>
          <Link to="/dashboard" className="btn btn-primary">View Alerts</Link>
          <a href="#features" className="btn btn-ghost">Learn More</a>
        </div>
      </section>

      <section className="container" id="features">
        <h2 className="section-title">What we offer</h2>
        <div className="features">
          {features.map((f) => (
            <div className="card" key={f.title}>
              <div className="icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">© 2026 Coastal Guard AI. All rights reserved.</footer>
    </>
  );
}

export default Home;