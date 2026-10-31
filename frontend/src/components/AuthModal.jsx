import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, loginUser } from "../services/api";

const KERALA_DISTRICTS = [
  "Alappuzha",
  "Ernakulam",
  "Idukki",
  "Kannur",
  "Kasaragod",
  "Kollam",
  "Kottayam",
  "Kozhikode",
  "Malappuram",
  "Palakkad",
  "Pathanamthitta",
  "Thiruvananthapuram",
  "Thrissur",
  "Wayanad",
];

function AuthModal({ mode, setMode, onClose, onLoginSuccess  }) {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "User",
    location: "",
    password: "",
  });

  if (!mode) return null;
  const isLogin = mode === "login";

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

      if (isLogin) {
      try {
        const res = await loginUser({
          email: formData.email,
          password: formData.password,
        });
        const loggedInUser = res.data.user;
        localStorage.setItem("user", JSON.stringify(loggedInUser));

        if (onLoginSuccess) {
          onLoginSuccess(loggedInUser);
        } else {
          onClose();
        }


        // Navigate based on role
        const role = (loggedInUser?.role || "").trim().toLowerCase();
        if (role === "admin") {
          navigate("/admin");
        } else if (role === "user") {
          navigate("/user");
        } else {
          navigate("/volunteer");;
        }
      } catch (err) {
        alert("Login failed: " + (err.response?.data?.detail || "Invalid email or password"));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Register flow
    try {
      await registerUser(formData);
      alert("Registration successful! You can now log in.");
      setMode("login");
    } catch (err) {
      alert("Registration failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h3>{isLogin ? "Welcome back" : "Create your account"}</h3>
        <p className="muted">
          {isLogin ? "Login to access your dashboard." : "Register to receive localized coastal alerts."}
        </p>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <input
                type="text"
                name="name"
                placeholder="Full name"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <select name="role" value={formData.role} onChange={handleChange} required>
                <option value="User">Register as User</option>
                <option value="Volunteer">Register as Volunteer</option>
              </select>

              <select
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select Kerala District
                </option>
                {KERALA_DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </>
          )}

          <input
            type="text"
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

          <button className="btn btn-primary full" type="submit" disabled={submitting}>
            {submitting ? "Please wait..." : isLogin ? "Login" : "Register"}
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
