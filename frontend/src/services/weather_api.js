import axios from "axios";



// Validates whether coordinates are inside Kerala
export const isInsideKerala = (lat, lon) => {
    return lat >= 8.15 && lat <= 12.85 && lon >= 74.8 && lon <= 77.4;
};


/**
 * 1. Fallback IP-based location detector (works instantly even if browser GPS is blocked/timed out)
 */
export const getIpLocation = async () => {
    try {
        const res = await axios.get("https://ipapi.co/json/", { timeout: 4000 });
        if (res.data && res.data.latitude && res.data.longitude) {
            return {
                lat: res.data.latitude,
                lon: res.data.longitude,
                city: res.data.city || res.data.region || "Kochi",
                district: res.data.region || "Kerala",
            };
        }
    } catch (err) {
        console.warn("IP location fallback error:", err);
    }
    // Default Kerala coastal coordinates
    return { lat: 9.9312, lon: 76.2673, city: "Kochi", district: "Ernakulam" };
};

/**
 * 2. Fetches live weather, sea wave conditions, and the exact place name
 */
export const getLiveWeatherByCoords = async (lat, lon, knownCity = "") => {
    // If coordinates are outside Kerala, default to Kochi, Kerala
    let targetLat = lat;
    let targetLon = lon;
    let isKerala = isInsideKerala(lat, lon);

    if (!isKerala) {
        targetLat = 9.9312;
        targetLon = 76.2673;
    }

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${targetLat}&longitude=${targetLon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,visibility`;
    const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${targetLat}&longitude=${targetLon}&current=wave_height`;
    const reverseGeoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLon}`;

    const [wRes, mRes, geoRes] = await Promise.allSettled([
        axios.get(weatherUrl),
        axios.get(marineUrl),
        axios.get(reverseGeoUrl, {
            headers: { "Accept-Language": "en" },
            timeout: 3000,
        }),
    ]);

    const current = wRes.status === "fulfilled" ? wRes.value.data.current : {};
    const marineCurrent = mRes.status === "fulfilled" ? mRes.value.data.current : {};

    let exactLocation = isKerala ? (knownCity || "Kerala Coast") : "Kochi (Kerala)";
    let userDistrict = isKerala ? "" : "Ernakulam";

    if (isKerala && geoRes.status === "fulfilled" && geoRes.value.data?.address) {
        const addr = geoRes.value.data.address;
        userDistrict = addr.state_district || addr.county || "";
        exactLocation =
            addr.city ||
            addr.town ||
            addr.suburb ||
            addr.village ||
            userDistrict ||
            "Kerala Coast";
    }

    return {
        location: exactLocation,
        district: userDistrict,
        isKerala,
        temp: Math.round(current.temperature_2m ?? 29),
        condition: current.weather_code <= 3 ? "Clear / Partly Cloudy" : "Overcast / Rain",
        wave_height: marineCurrent.wave_height ?? 1.6,
        wind_speed: Math.round(current.wind_speed_10m ?? 20),
        humidity: current.relative_humidity_2m ?? 75,
        visibility: current.visibility ? (current.visibility / 1000).toFixed(1) : 10,
    };
};