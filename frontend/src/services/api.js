import axios from "axios";

// FastAPI backend (port 8000)
const api = axios.create({
  baseURL: "http://192.168.1.9:8000",
  timeout: 8000,
});

export const getHealthCheck = () => api.get("/health");
export const getAlerts = () => api.get("/alerts");
export const getContacts = (district = "") =>
  api.get(district ? `/contacts?district=${district}` : "/contacts");
export const sendSOS = (data) => api.post("/sos", data);
export const registerUser = (data) => api.post("/users/register", data);
export const loginUser = (data) => api.post("/users/login", data);
export const getLocations = () => api.get("/locations");

export default api;