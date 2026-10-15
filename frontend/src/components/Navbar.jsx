import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="container nav-inner">
        <div className="logo">🌊 Coastal Guard <span>AI</span></div>
        <div className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;