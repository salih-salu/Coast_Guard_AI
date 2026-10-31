import { contacts } from "../data/contacts";

function EmergencyModal({ open, onClose }) {
  if (!open) return null;

  // Find only the Coast Guard contact from data/contacts.js
  const coastGuard = contacts.find((c) =>
    c.name.toLowerCase().includes("coast guard")
  );

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal sos-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h3>🚨 Emergency SOS</h3>
        <p className="muted">Direct line for immediate maritime rescue and assistance.</p>

        {coastGuard && (
          <a href={`tel:${coastGuard.number}`} className="sos-call">
            <span>{coastGuard.icon} {coastGuard.name}</span>
            <b>{coastGuard.number}</b>
          </a>
        )}
      </div>
    </div>
  );
}

export default EmergencyModal;
