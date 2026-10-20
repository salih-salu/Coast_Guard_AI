import axios from "axios";

const api = axios.create({ baseURL: "http://192.168.1.8:8000/api" });

export const getAlerts = () => api.get("/alerts");
export const getWeather = () => api.get("/weather");
export const registerUser = (data) => api.post("/register", data);