import { useState, useRef, useEffect } from "react";

function getReply(text) {
  const t = text.toLowerCase();
  if (t.includes("weather") || t.includes("wave")) return "Check the Weather section for live wave height, wind and visibility.";
  if (t.includes("alert") || t.includes("risk")) return "Active alerts are shown in the Alerts section, colored by High, Medium and Low risk.";
  if (t.includes("emergency") || t.includes("help") || t.includes("sos")) return "Press the red SOS button at the top for emergency numbers. Coast Guard helpline: 7736596093.";
  if (t.includes("fish")) return "Always check wave height and wind before going to sea. Avoid the sea when risk is High.";
  return "I can help with weather, alerts and emergency contacts. Try asking: 'Is it safe to go fishing?'";
}

function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I'm Coastal Guard Assistant 🌊 How can I help you?" },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = { from: "user", text: input };
    const botMsg = { from: "bot", text: getReply(input) };
    setMessages((m) => [...m, userMsg, botMsg]);
    setInput("");
  };

  return (
    <>
      {open && (
        <div className="chat-box">
          <div className="chat-head">
            <span>🤖 Coastal Assistant</span>
            <button onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="chat-msgs">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.from}`}>{m.text}</div>
            ))}
            <div ref={endRef} />
          </div>
          <form className="chat-form" onSubmit={send}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question..." />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
      <button className="chat-fab" onClick={() => setOpen(!open)}>
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}

export default Chatbot;