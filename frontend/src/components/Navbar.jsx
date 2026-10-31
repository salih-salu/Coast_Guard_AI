import { Link } from "react-router-dom";

function Navbar({ currentUser, onLogin, onRegister, onLogout, onSOS }) {
  // Destination dashboard based on role
  const role = (currentUser?.role || "").toLowerCase();
  const dashboardPath =
    role === "admin" ? "/admin" : role === "user" ? "/user" : "/volunteer";

  return (
    <nav className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="logo">
          🌊 Coastal Guard <span>AI</span>
        </Link>

        <div className="nav-links">
          <a href="/#weather">Weather</a>
          <a href="/#alerts">Alerts</a>
          <a href="/#contacts">Contacts</a>
        </div>

        <div className="nav-actions">
          {currentUser ? (
            <>
              {/* Displays User Name linking to their Dashboard */}
              <Link to={dashboardPath} className="btn btn-ghost">
                👤 {currentUser.name}
              </Link>
              <button className="btn btn-ghost" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={onLogin}>
                Login
              </button>
              <button className="btn btn-primary" onClick={onRegister}>
                Register
              </button>
            </>
          )}
          <button className="btn btn-sos" onClick={onSOS}>
            🚨 SOS
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
