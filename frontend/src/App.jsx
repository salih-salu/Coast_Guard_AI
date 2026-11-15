import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import EmergencyModal from "./components/EmergencyModal";
import Chatbot from "./components/Chatbot";
import Home from "./pages/Home";
import UserPage from "./pages/UserPage";
import VolunteerPage from "./pages/VolunteerPage";
import AdminPage from "./pages/AdminPage";
import KeralaMap from "./components/KeralaMap";
import { getHealthCheck, setUserDutyStatus } from "./services/api";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState("connecting");
  const navigate = useNavigate();

  // Check Backend & Supabase on app start
  useEffect(() => {
    let mounted = true;
    getHealthCheck()
      .then((res) => {
        if (!mounted) return;
        if (res.data?.status === "ok") {
          setDbStatus("online");
        } else {
          setDbStatus("offline");
        }
      })
      .catch(() => {
        if (mounted) setDbStatus("offline");
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Load cached user safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved) setCurrentUser(JSON.parse(saved));
    } catch {
      localStorage.removeItem("user");
    }
  }, []);

  const handleLogout = async () => {
    if (currentUser && ["volunteer", "lifeguard", "coastal_guard", "guide"].includes((currentUser.role || "").toLowerCase())) {
      try {
        await setUserDutyStatus(currentUser.email || currentUser.id, false);
      } catch (e) {
        console.warn("Could not set duty status on logout:", e);
      }
    }
    localStorage.removeItem("user");
    setCurrentUser(null);
    navigate("/");
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setAuthMode(null);
    const role = (user.role || "").toLowerCase();
    if (role === "admin") navigate("/admin");
    else if (role === "user") navigate("/user");
    else navigate("/volunteer");
  };

  return (
    <>
      {/* Top Banner showing live backend connection status */}
      <div
        style={{
          background: dbStatus === "online" ? "#065f46" : "#991b1b",
          color: "#ffffff",
          fontSize: "12px",
          padding: "4px 16px",
          textAlign: "center",
          fontWeight: 600,
          letterSpacing: "0.5px",
        }}
      >
        {dbStatus === "online"
          ? "🟢 System Live · Connected to Supabase Cloud"
          : "🔴 Backend Offline · Start FastAPI on port 8000"}
      </div>

      <Navbar
        currentUser={currentUser}
        onLogin={() => setAuthMode("login")}
        onRegister={() => setAuthMode("register")}
        onLogout={handleLogout}
        onSOS={() => setSosOpen(true)}
      />

      <Routes>
        <Route path="/" element={<Home onSOS={() => setSosOpen(true)} />} />
        <Route
          path="/user"
          element={<UserPage onLogout={handleLogout} onSOS={() => setSosOpen(true)} />}
        />
        <Route
          path="/volunteer"
          element={<VolunteerPage onLogout={handleLogout} onSOS={() => setSosOpen(true)} />}
        />
        <Route
          path="/admin"
          element={<AdminPage onLogout={handleLogout} onSOS={() => setSosOpen(true)} />}
        />
      </Routes>

      <AuthModal
        mode={authMode}
        setMode={setAuthMode}
        onClose={() => setAuthMode(null)}
        onLoginSuccess={handleLoginSuccess}
      />
      <EmergencyModal open={sosOpen} onClose={() => setSosOpen(false)} />
      <KeralaMap />
      <Chatbot />
    </>
  );
}

export default App;
