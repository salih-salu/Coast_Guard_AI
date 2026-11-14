import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAlerts, getContacts, getSOSAlerts } from "../services/api";
import { contacts as defaultContacts } from "../data/contacts";
import WeatherCard from "../components/WeatherCard";

function UserPage({ onLogout, onSOS }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [contactsList, setContactsList] = useState(defaultContacts);
  const [localAlerts, setLocalAlerts] = useState([]);
  const [mySOSList, setMySOSList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let parsed = null;

    try {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) {
        navigate("/");
        return;
      }
      parsed = JSON.parse(savedUser);
      setUser(parsed);
    } catch {
      localStorage.removeItem("user");
      navigate("/");
      return;
    }

    const loadDashboardData = async () => {
      try {
        const [aRes, cRes] = await Promise.allSettled([getAlerts(), getContacts()]);

        if (aRes.status === "fulfilled" && Array.isArray(aRes.value?.data)) {
          setLocalAlerts(aRes.value.data.slice(0, 3));
        }

        if (cRes.status === "fulfilled" && Array.isArray(cRes.value?.data) && cRes.value.data.length > 0) {
          const mapped = cRes.value.data.map((c) => ({
            name: c.organization || c.name,
            number: c.phone || c.alternate_phone,
            icon: c.category === "Medical" ? "🚑" : c.category === "Police" ? "👮" : "⚓",
          }));
          setContactsList(mapped);
        }
      } catch (err) {
        console.warn("User dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();

    const fetchSOSStatus = () => {
      const userPhone = parsed?.phone || "";
      const userEmail = parsed?.email || "";
      if (!userPhone && !userEmail) {
        setMySOSList([]);
        return;
      }

      getSOSAlerts(userPhone, userEmail)
        .then((res) => {
          if (Array.isArray(res?.data)) setMySOSList(res.data);
        })
        .catch(() => { });
    };

    fetchSOSStatus();
    const sosTimer = setInterval(fetchSOSStatus, 4000);
    return () => clearInterval(sosTimer);
  }, [navigate]);

  const handleLogout = () => {
    if (onLogout) onLogout();
    else {
      localStorage.removeItem("user");
      navigate("/");
    }
  };

  if (loading || !user) {
    return (
      <div className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
        <p className="message">Loading your coastal safety dashboard…</p>
      </div>
    );
  }

  const isFisherman = (user.user_type || "").toLowerCase() === "fisherman";
  const displayName = user.name || user.full_name || "User";

  return (
    <div
      className="container user-page-container"
      style={{ padding: "20px 20px 72px", position: "relative", maxWidth: 1200, margin: "0 auto" }}
    >
      {/* ─── SLIDE-OUT DRAWER ─────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(340px, 88vw)",
              height: "100%",
              background: "#0a1628",
              borderRight: "1px solid rgba(148,163,184,0.12)",
              padding: "28px 22px",
              boxShadow: "8px 0 40px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflowY: "auto",
              animation: "drawerSlideIn 0.22s ease-out",
            }}
          >
            <div>
              {/* Drawer header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 24,
                  paddingBottom: 16,
                  borderBottom: "1px solid rgba(148,163,184,0.12)",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--accent)", letterSpacing: "0.02em" }}>
                  Profile & Directory
                </span>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    fontSize: 20,
                    cursor: "pointer",
                    padding: "4px 8px",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Profile card */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid rgba(148,163,184,0.12)",
                  borderRadius: 16,
                  padding: "20px 18px",
                  marginBottom: 28,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "rgba(34, 211, 238, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    marginBottom: 14,
                  }}
                >
                  👤
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 650 }}>{displayName}</h3>
                <span
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: isFisherman ? "rgba(2, 132, 199, 0.2)" : "rgba(13, 148, 136, 0.2)",
                    color: isFisherman ? "#38bdf8" : "#2dd4bf",
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    display: "inline-block",
                    marginBottom: 14,
                  }}
                >
                  {isFisherman ? "Registered Fisherman" : "Coastal Resident"}
                </span>

                <div style={{ fontSize: 13, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div>
                    District · <b style={{ color: "var(--text)", fontWeight: 550 }}>{user.location || "Kerala Coast"}</b>
                  </div>
                  <div style={{ wordBreak: "break-all" }}>
                    {user.email}
                  </div>
                  <div>{user.phone || "Phone not set"}</div>
                </div>
              </div>

              {/* Emergency contacts */}
              <div>
                <h4
                  style={{
                    fontSize: 12,
                    fontWeight: 650,
                    color: "var(--muted)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: 12,
                  }}
                >
                  Emergency Helplines
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {contactsList.slice(0, 6).map((c, i) => (
                    <a
                      key={(c.name || "contact") + i}
                      href={`tel:${c.number}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        background: "rgba(15, 23, 42, 0.5)",
                        borderRadius: 12,
                        border: "1px solid rgba(148,163,184,0.1)",
                        color: "var(--text)",
                        textDecoration: "none",
                        fontSize: 13,
                        transition: "border-color 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{c.icon || "📞"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c.name}
                        </div>
                        <small style={{ color: "var(--accent)", fontSize: 12 }}>{c.number}</small>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Logout */}
            <div style={{ paddingTop: 20, borderTop: "1px solid rgba(148,163,184,0.12)", marginTop: 24 }}>
              <button
                className="btn btn-ghost full"
                onClick={handleLogout}
                style={{ width: "100%", justifyContent: "center", fontWeight: 550 }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOP BAR ──────────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 28,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              color: "var(--text)",
              padding: "10px 14px",
              borderRadius: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "var(--shadow)",
            }}
          >
            <span style={{ fontSize: 15 }}>☰</span>
            Menu
          </button>

          <div>
            <h1 style={{ fontSize: 20, margin: 0, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Hi, <span style={{ color: "var(--accent)" }}>{displayName}</span>
            </h1>
            <p className="muted" style={{ fontSize: 13, margin: "3px 0 0" }}>
              {user.location || "Kerala Coast"} · {isFisherman ? "Fisherman" : "Resident"}
            </p>
          </div>
        </div>

        <button
          className="btn btn-sos"
          onClick={onSOS}
          style={{
            padding: "10px 20px",
            fontSize: 13.5,
            fontWeight: 700,
            letterSpacing: "0.02em",
            borderRadius: 12,
          }}
        >
          Emergency SOS
        </button>
      </header>

      {/* ─── MAIN GRID ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: 24,
          marginBottom: 32,
          alignItems: "stretch",
        }}
      >
        {/* Weather */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <WeatherCard title="Real-Time Marine Conditions" />
        </div>

        {/* Safety guidelines */}
        <section style={{ display: "flex", flexDirection: "column" }}>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 className="section-title" style={{ fontSize: 16, fontWeight: 650, margin: 0 }}>
              {isFisherman ? "Seafarer Safety Guidelines" : "Coastal Resident Precautions"}
            </h2>
          </div>

          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 16,
              padding: "22px 24px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "var(--shadow)",
            }}
          >
            <ul
              style={{
                paddingLeft: 18,
                color: "var(--muted)",
                lineHeight: 1.85,
                fontSize: 14,
                margin: 0,
              }}
            >
              {isFisherman ? (
                <>
                  <li>Keep VHF marine radio tuned to Channel 16 at all times.</li>
                  <li>Check wave heights before crossing harbour mouths and bars.</li>
                  <li>Ensure DAT and lifejackets are onboard and functional.</li>
                  <li>Do not venture beyond 12 NM during red/orange surge alerts.</li>
                </>
              ) : (
                <>
                  <li>Keep important documents in waterproof bags during monsoon surge.</li>
                  <li>Identify your nearest designated cyclone / flood relief shelter.</li>
                  <li>Stay clear of shorelines, groynes and breakwaters at high tide.</li>
                  <li>Report tidal flooding or breached sea walls to the local ward member.</li>
                </>
              )}
            </ul>

            <div
              style={{
                marginTop: 20,
                paddingTop: 14,
                borderTop: "1px solid var(--line)",
              }}
            >
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Immediate coast assistance ·{" "}
                <b style={{ color: "var(--accent)" }}>MRCC 1554</b>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ─── LOCAL ALERTS ─────────────────────────────────────────────────── */}
      <section>
        <div className="section-header" style={{ marginBottom: 14 }}>
          <h2 className="section-title" style={{ fontSize: 16, fontWeight: 650, margin: 0 }}>
            Recent Coastal Advisories
          </h2>
        </div>

        {localAlerts.length > 0 ? (
          <div className="alert-grid">
            {localAlerts.map((a) => {
              const riskKey = (a.alert_level || a.risk || "medium").toLowerCase();
              return (
                <div key={a.alert_id || a.id} className={`alert-card ${riskKey}`}>
                  <div className="alert-top">
                    <h4>📍 {a.affected_district || a.location || "Coastal Kerala"}</h4>
                    <span className={`risk ${riskKey}`}>
                      {(a.alert_level || a.risk || "MEDIUM").toUpperCase()}
                    </span>
                  </div>
                  <p>{a.title || a.type || a.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              background: "var(--card)",
              padding: "22px 24px",
              borderRadius: 14,
              border: "1px solid var(--line)",
            }}
          >
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              No critical coastal alerts currently issued for your region. Sea conditions are within normal limits.
            </p>
          </div>
        )}
      </section>

      {/* ─── LIVE RESCUE STATUS (BOTTOM SECTION) ───────────────────────────── */}
      {mySOSList.length > 0 && (
        <section
          style={{
            background: "linear-gradient(160deg, rgba(239,68,68,0.07) 0%, rgba(15,23,42,0.85) 100%)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 18,
            padding: "22px 24px",
            marginTop: 32,
            boxShadow: "0 10px 32px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 18,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 650 }}>Live Rescue Status</h2>
              <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 0" }}>
                Real-time tracking of your emergency request
              </p>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "5px 12px",
                borderRadius: 999,
                background: "rgba(34,211,238,0.12)",
                color: "var(--accent)",
                letterSpacing: "0.04em",
              }}
            >
              LIVE
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mySOSList.slice(0, 3).map((sos) => {
              const status = sos.status || "";
              const isReported = ["reported", "in_progress", "verified", "resolved"].includes(status);
              const isDispatched = ["in_progress", "verified", "resolved"].includes(status);
              const isConfirmed = ["verified", "resolved"].includes(status);
              const isResolved = status === "resolved";

              const steps = [
                { label: "SOS Sent", sub: "Delivered", active: isReported, icon: "1" },
                { label: "Admin Accepted", sub: isDispatched ? "Dispatched" : "Awaiting", active: isDispatched, icon: "2" },
                { label: "Volunteer", sub: isConfirmed ? "On site" : "Awaiting", active: isConfirmed, icon: "3" },
                { label: "Resolved", sub: isResolved ? "Safe" : "In progress", active: isResolved, icon: "4" },
              ];

              return (
                <div
                  key={sos.incident_id}
                  style={{
                    background: "rgba(15,23,42,0.7)",
                    border: "1px solid rgba(148,163,184,0.12)",
                    borderRadius: 14,
                    padding: "16px 18px",
                    borderLeft: `4px solid ${
                      isResolved
                        ? "var(--low)"
                        : isConfirmed
                        ? "var(--accent)"
                        : isDispatched
                        ? "var(--medium)"
                        : "var(--high)"
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 14,
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <b style={{ fontSize: 14 }}>
                      Incident #{sos.incident_id} · {sos.place} ({sos.district})
                    </b>
                    <small className="muted" style={{ fontSize: 12 }}>
                      {new Date(sos.reported_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </small>
                  </div>

                  {/* Progress steps */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {steps.map((step, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: "10px 6px",
                          borderRadius: 10,
                          textAlign: "center",
                          background: step.active ? "rgba(34,211,238,0.1)" : "rgba(15,23,42,0.5)",
                          border: step.active ? "1px solid rgba(34,211,238,0.35)" : "1px solid rgba(148,163,184,0.1)",
                          opacity: step.active ? 1 : 0.45,
                        }}
                      >
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: step.active ? "var(--accent)" : "rgba(148,163,184,0.2)",
                            color: step.active ? "#0a1628" : "var(--muted)",
                            fontSize: 11,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 6px",
                          }}
                        >
                          {step.icon}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 650, lineHeight: 1.2 }}>{step.label}</div>
                        <div style={{ fontSize: 10, color: step.active ? "var(--accent)" : "var(--muted)", marginTop: 2 }}>
                          {step.sub}
                        </div>
                      </div>
                    ))}
                  </div>

                  {(sos.description || sos.title) && (
                    <p className="muted" style={{ fontSize: 13, margin: 0, lineHeight: 1.45 }}>
                      {sos.description || sos.title}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default UserPage;