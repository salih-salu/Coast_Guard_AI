import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import AuthModal from "./components/AuthModal";
import EmergencyModal from "./components/EmergencyModal";
import Chatbot from "./components/Chatbot";
import Home from "./pages/Home";

function App() {
  const [authMode, setAuthMode] = useState(null); // null | "login" | "register"
  const [sosOpen, setSosOpen] = useState(false);

  return (
    <>
      <Navbar
        onLogin={() => setAuthMode("login")}
        onRegister={() => setAuthMode("register")}
        onSOS={() => setSosOpen(true)}
      />

      <Routes>
        <Route path="/" element={<Home onSOS={() => setSosOpen(true)} />} />
      </Routes>

      <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setAuthMode(null)} />
      <EmergencyModal open={sosOpen} onClose={() => setSosOpen(false)} />
      <Chatbot />
    </>
  );
}

export default App;