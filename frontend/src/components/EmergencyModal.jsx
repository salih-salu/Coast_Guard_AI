import { contacts } from "../data/contacts";

function EmergencyModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal sos-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>
        <h3>🚨 Emergency Help</h3>
        <p className="muted">Tap a number to call. Stay calm and share your exact location.</p>

        {contacts.slice(0, 3).map((c) => (
          <a key={c.name} href={`tel:${c.number}`} className="sos-call">
            <span>{c.icon} {c.name}</span>
            <b>{c.number}</b>
          </a>
        ))}
      </div>
    </div>
  );
}

export default EmergencyModal;