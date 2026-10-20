import { useState } from "react";
import { registerUser } from "../services/api";

function AuthModal({ mode, setMode, onClose }) {
  if (!mode) return null;
  const isLogin = mode === "login";

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      alert("Login coming soon!");
      onClose();
      return;
    }

    try {
      await registerUser(formData);
      alert("Registration successful! Details saved to Excel sheet.");
      onClose();
    } catch (err) {
      alert("Registration failed: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h3>{isLogin ? "Welcome back" : "Create your account"}</h3>
        <p className="muted">
          {isLogin ? "Login to get more benefits." : "Register to receive more updates."}
        </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              type="text"
              name="name"
              placeholder="Full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required
          />
          {!isLogin && (
            <input
              type="tel"
              name="phone"
              placeholder="Phone number"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          )}
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button className="btn btn-primary full" type="submit">
            {isLogin ? "Login" : "Register"}
          </button>
        </form>

        <p className="switch">
          {isLogin ? "New here? " : "Already have an account? "}
          <a href="#!" onClick={(e) => { e.preventDefault(); setMode(isLogin ? "register" : "login"); }}>
            {isLogin ? "Register" : "Login"}
          </a>
        </p>
      </div>
    </div>
  );
}

export default AuthModal;
