import axios from "axios";

// FastAPI backend (port 8000)
// Uses dynamic host: if on localhost/127.0.0.1, connects to localhost:8000,
// otherwise uses your current Wi-Fi LAN IP (192.168.1.8) for phone access.
const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
const baseURL = isLocal ? "http://localhost:8000" : `http://${hostname}:8000`;

const api = axios.create({
  baseURL,
  timeout: 8000,
});

export const getHealthCheck = () => api.get("/health");
export const getAlerts = () => api.get("/alerts");
export const createAlert = (data) => api.post("/alerts", data);
export const getContacts = (district = "") =>
  api.get(district ? `/contacts?district=${district}` : "/contacts");
export const sendSOS = (data) => api.post("/sos", data);
export const getSOSAlerts = (phone = "", email = "") => {
  const params = new URLSearchParams();
  if (phone) params.append("phone", phone);
  if (email) params.append("email", email);
  const q = params.toString();
  return api.get(q ? `/sos/alerts?${q}` : "/sos/alerts");
};
export const updateSOSStatus = (id, status, note = "") =>
  api.post(`/sos/${id}/status`, { status, note });
export const registerUser = (data) => api.post("/users/register", data);
export const loginUser = (data) => api.post("/users/login", data);
export const setUserDutyStatus = (emailOrId, onDuty) =>
  api.post("/users/status/duty", { email: emailOrId, on_duty: onDuty });
export const getLocations = () => api.get("/locations");

export default api;