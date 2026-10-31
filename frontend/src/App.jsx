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

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState(null); // null | "login" | "register"
  const [sosOpen, setSosOpen] = useState(false);
  const navigate = useNavigate();

  // Load user from localStorage on start
  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved) setCurrentUser(JSON.parse(saved));
    } catch {
      localStorage.removeItem("user");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setCurrentUser(null);
    navigate("/");
  };

  const handleLoginSuccess = (user) => {
  setCurrentUser(user);
  setAuthMode(null);
  const role = (user.role || "").toLowerCase();
  if (role === "admin") {
    navigate("/admin");
  } else if (role === "user") {
    navigate("/user");
  } else {
    navigate("/volunteer");
  }
};

  return (
    <>
      <Navbar
        currentUser={currentUser}
        onLogin={() => setAuthMode("login")}
        onRegister={() => setAuthMode("register")}
        onLogout={handleLogout}
        onSOS={() => setSosOpen(true)}
      />

      <Routes>
        <Route path="/" element={<Home onSOS={() => setSosOpen(true)} />} />
        <Route path="/user" element={<UserPage onLogout={handleLogout} onSOS={() => setSosOpen(true)} />} />
        <Route path="/volunteer" element={<VolunteerPage onLogout={handleLogout} onSOS={() => setSosOpen(true)} />} />
        <Route path="/admin" element={<AdminPage onLogout={handleLogout} onSOS={() => setSosOpen(true)} />} />
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
