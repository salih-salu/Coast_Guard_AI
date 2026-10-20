function Navbar({ onLogin, onRegister, onSOS }) {
  return (
    <nav className="navbar">
      <div className="container nav-inner">
        <div className="logo">🌊 Coastal Guard <span>AI</span></div>

        <div className="nav-links">
          <a href="#weather">Weather</a>
          <a href="#alerts">Alerts</a>
          <a href="#contacts">Contacts</a>
        </div>

        <div className="nav-actions">
          <button className="btn btn-ghost" onClick={onLogin}>Login</button>
          <button className="btn btn-primary" onClick={onRegister}>Register</button>
          <button className="btn btn-sos" onClick={onSOS}>🚨 SOS</button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;