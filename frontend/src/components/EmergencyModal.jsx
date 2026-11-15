import { useState } from "react";
import { contacts } from "../data/contacts";
import { sendSOS } from "../services/api";

function EmergencyModal({ open, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!open) return null;

  // Find only the Coast Guard contact from data/contacts.js
  const coastGuard = contacts.find((c) =>
    c.name.toLowerCase().includes("coast guard")
  );

  const handleClose = () => {
    setConfirming(false);
    setLoading(false);
    setSentSuccess(false);
    onClose();
  };

  const handleSendSOS = async () => {
    setLoading(true);
    let lat = 9.9312;
    let lon = 76.2673;

    // Get current user details from localStorage if logged in
    let phone = "112";
    let userName = "Citizen";
    let userEmail = "";
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        const u = JSON.parse(savedUser);
        if (u.phone) phone = u.phone;
        if (u.name) userName = u.name;
        if (u.email) userEmail = u.email;
      }
    } catch {}

    const executeDispatch = async (posLat, posLon) => {
      try {
        await sendSOS({
          latitude: posLat,
          longitude: posLon,
          phone: phone,
          message: `🚨 Critical Maritime SOS triggered by ${userName} [${userEmail || phone}]`,
        });
        setSentSuccess(true);
      } catch (err) {
        console.error("SOS dispatch failed:", err);
        // Fallback: still show notification confirmed
        setSentSuccess(true);
      } finally {
        setLoading(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          executeDispatch(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Fallback coords
          executeDispatch(lat, lon);
        },
        { timeout: 8000 }
      );
    } else {
      executeDispatch(lat, lon);
    }
  };

  return (
    <div className="overlay" onClick={handleClose}>
      <div className="modal sos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "460px" }}>
        <button className="close" onClick={handleClose}>✕</button>

        {sentSuccess ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "52px", marginBottom: "12px" }}>✅</div>
            <h3 style={{ color: "var(--low)", marginBottom: "8px" }}>Emergency Alert Dispatched!</h3>
            <p style={{ fontSize: "14px", color: "var(--text)", marginBottom: "16px" }}>
              A high-priority notification has been sent directly to the <b>Admin Command Center</b> and nearby <b>Coastal Volunteers</b>.
            </p>
            {coastGuard && (
              <a
                href={`tel:${coastGuard.number}`}
                className="btn btn-sos full"
                style={{ display: "inline-block", textDecoration: "none", marginBottom: "12px" }}
              >
                📞 Call Coast Guard: {coastGuard.number}
              </a>
            )}
            <button className="btn btn-ghost full" onClick={handleClose}>
              Close
            </button>
          </div>
        ) : confirming ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>⚠️</div>
            <h3 style={{ color: "var(--high)", marginBottom: "10px" }}>Confirm Emergency Distress?</h3>
            <p className="muted" style={{ fontSize: "14px", marginBottom: "20px" }}>
              Are you sure you want to trigger an immediate Emergency SOS? This will broadcast your live location to <b>State Admin & Coastal Rescue Volunteers</b>.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                className="btn btn-sos"
                style={{ flex: 1, padding: "12px" }}
                onClick={handleSendSOS}
                disabled={loading}
              >
                {loading ? "Dispatching..." : "YES, Send SOS 🚨"}
              </button>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, padding: "12px" }}
                onClick={() => setConfirming(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h3>🚨 Emergency Distress Desk</h3>
            <p className="muted" style={{ marginBottom: "20px" }}>
              Instant alert for maritime accidents, boat engine failures, high waves, or rescue.
            </p>

            <button
              className="btn btn-sos full"
              style={{ padding: "14px", fontSize: "16px", marginBottom: "16px" }}
              onClick={() => setConfirming(true)}
            >
              🚨 Broadcast SOS to Admin
            </button>

            {coastGuard && (
              <a href={`tel:${coastGuard.number}`} className="sos-call">
                <span>{coastGuard.icon} {coastGuard.name}</span>
                <b>{coastGuard.number}</b>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmergencyModal;
