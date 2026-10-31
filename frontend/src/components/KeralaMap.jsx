import { useState, useEffect, useRef } from "react";

// District-level risk status (shared by all coastal locations in that district)
const DISTRICTS = {
  Kasaragod:          { risk: "High",     waves: "2.8m", wind: "38 km/h", status: "High surge advisory" },
  Kannur:             { risk: "High",     waves: "2.7m", wind: "35 km/h", status: "Strong inshore rip currents" },
  Kozhikode:          { risk: "High",     waves: "2.6m", wind: "32 km/h", status: "Rough sea alert near beach" },
  Malappuram:         { risk: "High",     waves: "2.5m", wind: "30 km/h", status: "High tidal swell" },
  Thrissur:           { risk: "Moderate", waves: "2.0m", wind: "24 km/h", status: "Moderate sea condition" },
  Ernakulam:          { risk: "Moderate", waves: "1.9m", wind: "22 km/h", status: "Caution for small craft" },
  Alappuzha:          { risk: "Moderate", waves: "1.8m", wind: "20 km/h", status: "Safe inside harbour lines" },
  Kollam:             { risk: "Low",      waves: "1.3m", wind: "16 km/h", status: "Normal waves" },
  Thiruvananthapuram: { risk: "Low",      waves: "1.4m", wind: "17 km/h", status: "Safe for visitors" },
};

// 25 coastal locations (south -> north). Add per-location values
// (risk / waves / wind / status) to any entry to override its district's values.
const COASTAL_LOCATIONS = [
  { name: "Vizhinjam",       district: "Thiruvananthapuram", lat: 8.3745,  lon: 76.9919 },
  { name: "Poovar",          district: "Thiruvananthapuram", lat: 8.3178,  lon: 77.0757 },
  { name: "Valiathura",      district: "Thiruvananthapuram", lat: 8.4604,  lon: 76.9396 },
  { name: "Shanghumugham",   district: "Thiruvananthapuram", lat: 8.4776,  lon: 76.9128 },
  { name: "Varkala",         district: "Thiruvananthapuram", lat: 8.7330,  lon: 76.7040 },
  { name: "Kollam Beach",    district: "Kollam",             lat: 8.8768,  lon: 76.5897 },
  { name: "Neendakara",      district: "Kollam",             lat: 8.9390,  lon: 76.5380 },
  { name: "Azheekal",        district: "Kollam",             lat: 9.1040,  lon: 76.4780 },
  { name: "Alappuzha Beach", district: "Alappuzha",          lat: 9.4900,  lon: 76.3220 },
  { name: "Arthunkal",       district: "Alappuzha",          lat: 9.6710,  lon: 76.2990 },
  { name: "Chellanam",       district: "Ernakulam",          lat: 9.8100,  lon: 76.2660 },
  { name: "Fort Kochi",      district: "Ernakulam",          lat: 9.9658,  lon: 76.2421 },
  { name: "Cherai Beach",    district: "Ernakulam",          lat: 10.1420, lon: 76.1790 },
  { name: "Munambam",        district: "Ernakulam",          lat: 10.1770, lon: 76.1720 },
  { name: "Kodungallur",     district: "Thrissur",           lat: 10.2100, lon: 76.1750 },
  { name: "Chavakkad",       district: "Thrissur",           lat: 10.5850, lon: 76.0010 },
  { name: "Ponnani",         district: "Malappuram",         lat: 10.7700, lon: 75.9200 },
  { name: "Tanur",           district: "Malappuram",         lat: 10.9680, lon: 75.8710 },
  { name: "Beypore",         district: "Kozhikode",          lat: 11.1700, lon: 75.8070 },
  { name: "Kozhikode Beach", district: "Kozhikode",          lat: 11.2620, lon: 75.7680 },
  { name: "Koyilandy",       district: "Kozhikode",          lat: 11.4340, lon: 75.6930 },
  { name: "Thalassery",      district: "Kannur",             lat: 11.7490, lon: 75.4890 },
  { name: "Payyambalam",     district: "Kannur",             lat: 11.8660, lon: 75.3480 },
  { name: "Bekal",           district: "Kasaragod",          lat: 12.3930, lon: 75.0300 },
  { name: "Kumbla",          district: "Kasaragod",          lat: 12.5760, lon: 74.9490 },
].map((loc) => ({ ...DISTRICTS[loc.district], ...loc }));

// Real Kerala state outline (381 points) as [lon, lat].
// Built from the official 2011 district boundaries (all 14 districts dissolved
// into one polygon, then simplified to ~300 m accuracy).
const KERALA_BORDER_RING = [
  [76.4774, 9.1224], [76.4867, 9.0869], [76.3482, 9.3873], [76.3202, 9.4826], [76.2794, 9.7894], [76.2838, 9.7513],
  [76.2377, 9.9568], [76.2407, 9.9822], [76.2208, 9.999], [76.1678, 10.1817], [76.2138, 10.1933], [76.163, 10.1836],
  [76.1004, 10.3817], [75.91, 10.7934], [75.8261, 11.1226], [75.8044, 11.1566], [75.8092, 11.163], [75.7484, 11.3184],
  [75.7366, 11.3252], [75.7318, 11.3562], [75.698, 11.4253], [75.6641, 11.4627], [75.6339, 11.4623], [75.6181, 11.4772],
  [75.5367, 11.694], [75.5533, 11.7026], [75.5245, 11.7082], [75.4763, 11.7668], [75.4538, 11.7717], [75.4616, 11.7799],
  [75.4476, 11.7829], [75.438, 11.8057], [75.3861, 11.8565], [75.3563, 11.8602], [75.3194, 11.9051], [75.3036, 11.9514],
  [75.2918, 11.9544], [75.2517, 12.0086], [75.2278, 12.0235], [75.2012, 12.0063], [75.1655, 12.0897], [75.1269, 12.2025],
  [75.0418, 12.3886], [75.0149, 12.4181], [74.9741, 12.5011], [74.9564, 12.5553], [74.9546, 12.5493], [74.9384, 12.5915],
  [74.9542, 12.6053], [74.9417, 12.6076], [74.9395, 12.5956], [74.9321, 12.6136], [74.9501, 12.6363], [74.928, 12.6117],
  [74.8879, 12.7077], [74.9059, 12.6946], [74.892, 12.7118], [74.8853, 12.7096], [74.8677, 12.7514], [74.8691, 12.7589],
  [74.8824, 12.7541], [74.9328, 12.7806], [74.9641, 12.7802], [74.9685, 12.7765], [74.9873, 12.7832], [74.9895, 12.7952],
  [74.9984, 12.7862], [75.0035, 12.791], [75.0094, 12.7675], [74.9825, 12.7384], [75.0113, 12.7279], [75.0009, 12.7156],
  [75.0503, 12.7193], [75.0547, 12.6946], [75.0396, 12.6868], [75.0466, 12.6666], [75.0694, 12.664], [75.0853, 12.6737],
  [75.0853, 12.7055], [75.1055, 12.698], [75.1118, 12.6808], [75.1331, 12.6745], [75.1526, 12.6823], [75.1501, 12.6737],
  [75.1604, 12.6715], [75.1376, 12.6446], [75.1611, 12.621], [75.2016, 12.6289], [75.1983, 12.6132], [75.2094, 12.6016],
  [75.2005, 12.5889], [75.2086, 12.5923], [75.2204, 12.5683], [75.2377, 12.5683], [75.2734, 12.6169], [75.2786, 12.6173],
  [75.3113, 12.5911], [75.3253, 12.5923], [75.3147, 12.5739], [75.2896, 12.584], [75.2837, 12.571], [75.2719, 12.5702],
  [75.2697, 12.5497], [75.28, 12.5242], [75.3029, 12.5228], [75.3043, 12.5033], [75.3323, 12.4996], [75.3364, 12.4641],
  [75.3599, 12.4652], [75.3721, 12.4768], [75.3677, 12.4917], [75.382, 12.5022], [75.4159, 12.4996], [75.4225, 12.4727],
  [75.3935, 12.4514], [75.3658, 12.4577], [75.3658, 12.4121], [75.3791, 12.3923], [75.4214, 12.3729], [75.4104, 12.3471],
  [75.4317, 12.3086], [75.4141, 12.2896], [75.4848, 12.29], [75.5396, 12.2156], [75.5326, 12.2007], [75.5525, 12.1917],
  [75.5772, 12.1569], [75.5923, 12.1468], [75.6195, 12.1558], [75.6361, 12.1483], [75.649, 12.1087], [75.6615, 12.0986],
  [75.7031, 12.1084], [75.702, 12.0923], [75.7178, 12.0856], [75.7149, 12.0706], [75.7536, 12.0856], [75.8029, 12.0796],
  [75.7941, 12.0557], [75.8011, 12.037], [75.8228, 12.0131], [75.8294, 11.9847], [75.8471, 11.9821], [75.8699, 11.9522],
  [76.0032, 11.9316], [76.0702, 11.9671], [76.1137, 11.9798], [76.1129, 11.8584], [76.1199, 11.8505], [76.156, 11.8703],
  [76.1902, 11.8715], [76.2076, 11.8617], [76.2098, 11.8274], [76.2238, 11.8083], [76.2455, 11.8031], [76.2801, 11.8124],
  [76.3077, 11.7848], [76.3184, 11.7515], [76.3523, 11.7384], [76.4137, 11.7586], [76.4104, 11.7425], [76.4274, 11.7261],
  [76.4034, 11.7112], [76.4167, 11.6719], [76.4439, 11.6473], [76.4322, 11.6312], [76.388, 11.6297], [76.378, 11.602],
  [76.3416, 11.5875], [76.3357, 11.5957], [76.3022, 11.5714], [76.2959, 11.5901], [76.279, 11.6009], [76.2333, 11.568],
  [76.2503, 11.5269], [76.2341, 11.5277], [76.2514, 11.5023], [76.2473, 11.4679], [76.2845, 11.4828], [76.2948, 11.4657],
  [76.3261, 11.4541], [76.3423, 11.4675], [76.3979, 11.4365], [76.4185, 11.4417], [76.4156, 11.4234], [76.4605, 11.3891],
  [76.5176, 11.3715], [76.508, 11.3543], [76.5478, 11.3588], [76.55, 11.3311], [76.5371, 11.3139], [76.5456, 11.3005],
  [76.5268, 11.2885], [76.5216, 11.2706], [76.4531, 11.2396], [76.4491, 11.2056], [76.4425, 11.2015], [76.4517, 11.1996],
  [76.4583, 11.1876], [76.4734, 11.1951], [76.4723, 11.2089], [76.4992, 11.2116], [76.5338, 11.1858], [76.6288, 11.1944],
  [76.6973, 11.2392], [76.7068, 11.2396], [76.7356, 11.2157], [76.7286, 11.1914], [76.6951, 11.1667], [76.7057, 11.1417],
  [76.712, 11.151], [76.7315, 11.1316], [76.7481, 11.1353], [76.7433, 11.1025], [76.7547, 11.0789], [76.7437, 11.0733],
  [76.7466, 11.0569], [76.7783, 11.0423], [76.8007, 11.0539], [76.7919, 11.0374], [76.7665, 11.0292], [76.7157, 11.0404],
  [76.6998, 11.0266], [76.6557, 10.9392], [76.6766, 10.9182], [76.7407, 10.891], [76.7816, 10.8913], [76.8283, 10.8726],
  [76.8538, 10.8398], [76.8501, 10.8181], [76.9009, 10.808], [76.9068, 10.7822], [76.888, 10.7318], [76.892, 10.7191],
  [76.8659, 10.6847], [76.8711, 10.681], [76.8821, 10.6391], [76.8144, 10.635], [76.8103, 10.6238], [76.8173, 10.6029],
  [76.8387, 10.5961], [76.8353, 10.5446], [76.8431, 10.5367], [76.8162, 10.4231], [76.8331, 10.4074], [76.8232, 10.3947],
  [76.8486, 10.3675], [76.8339, 10.3391], [76.8372, 10.3372], [76.8283, 10.3073], [76.8486, 10.2845], [76.8733, 10.2976],
  [76.8733, 10.2755], [76.8957, 10.258], [76.9119, 10.2344], [76.9395, 10.2382], [76.9819, 10.2195], [77.0485, 10.2595],
  [77.053, 10.2722], [77.0437, 10.2841], [77.1807, 10.3577], [77.2352, 10.3529], [77.2275, 10.3166], [77.2636, 10.2639],
  [77.2591, 10.2303], [77.2882, 10.2322], [77.2952, 10.2184], [77.2746, 10.1851], [77.2672, 10.1223], [77.2404, 10.1302],
  [77.2069, 10.1182], [77.2039, 10.0883], [77.2639, 10.0293], [77.2547, 10.0125], [77.265, 10.0042], [77.2728, 9.9643],
  [77.2466, 9.9519], [77.2183, 9.9049], [77.2209, 9.8851], [77.2124, 9.8776], [77.2374, 9.8522], [77.2231, 9.8454],
  [77.222, 9.823], [77.2411, 9.8163], [77.2466, 9.7984], [77.2227, 9.7883], [77.2326, 9.7692], [77.2201, 9.7449],
  [77.2238, 9.7304], [77.2035, 9.7221], [77.2069, 9.6949], [77.1807, 9.6579], [77.1675, 9.6126], [77.2087, 9.6134],
  [77.2341, 9.5816], [77.2698, 9.573], [77.3177, 9.6026], [77.3298, 9.5992], [77.3254, 9.5801], [77.3394, 9.5734],
  [77.3611, 9.6022], [77.3659, 9.5962], [77.3575, 9.5947], [77.3597, 9.5775], [77.3501, 9.5671], [77.3652, 9.5529],
  [77.3652, 9.5465], [77.3851, 9.5192], [77.4005, 9.5275], [77.4123, 9.5091], [77.3991, 9.4964], [77.3924, 9.4594],
  [77.377, 9.4527], [77.3637, 9.4576], [77.3416, 9.4239], [77.3383, 9.3735], [77.3251, 9.3373], [77.3, 9.3369],
  [77.2993, 9.3111], [77.282, 9.2988], [77.2886, 9.2741], [77.2753, 9.2349], [77.2823, 9.2169], [77.2525, 9.1897],
  [77.2643, 9.1863], [77.268, 9.1534], [77.247, 9.1239], [77.212, 9.1], [77.1973, 9.0465], [77.1671, 9.0451],
  [77.1468, 9.0215], [77.1962, 8.9546], [77.1929, 8.9262], [77.2212, 8.9273], [77.2212, 8.9042], [77.2573, 8.8758],
  [77.2639, 8.8422], [77.2319, 8.807], [77.2293, 8.7839], [77.2131, 8.7786], [77.2172, 8.7682], [77.198, 8.7693],
  [77.1914, 8.742], [77.1726, 8.7495], [77.17, 8.742], [77.2069, 8.6845], [77.201, 8.6691], [77.2345, 8.6269],
  [77.2485, 8.6213], [77.2463, 8.6038], [77.2698, 8.5783], [77.2838, 8.547], [77.2617, 8.5062], [77.2389, 8.4961],
  [77.2135, 8.5122], [77.2013, 8.501], [77.2271, 8.4468], [77.2061, 8.4438], [77.1678, 8.3837], [77.1505, 8.3844],
  [77.1608, 8.3736], [77.1524, 8.3549], [77.1737, 8.3586], [77.1664, 8.3426], [77.1796, 8.3228], [77.173, 8.3186],
  [77.1686, 8.3325], [77.1288, 8.3246], [77.0979, 8.2925], [76.9863, 8.3758], [76.9598, 8.4218], [76.6995, 8.7386],
  [76.6818, 8.776], [76.6104, 8.8597], [76.5816, 8.8803], [76.5658, 8.8799], [76.5478, 8.9027], [76.5356, 8.9341],
  [76.5441, 8.9363], [76.5356, 8.9363], [76.4774, 9.1224]
];

// ---- Look & feel of everything OUTSIDE Kerala --------------------------
const OUTSIDE_COLOR = "#07182b";   // colour that hides other states / sea
const OUTSIDE_OPACITY = 0.9;         // 1 = fully hidden, 0.85 = faint ghost of the map
const BORDER_COLOR = "#38bdf8";    // glowing Kerala outline

const riskColor = (risk) =>
  risk === "High" ? "#ef4444" : risk === "Moderate" ? "#f59e0b" : "#10b981";

function KeralaMap() {
  const [open, setOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState(COASTAL_LOCATIONS.find((l) => l.name === "Fort Kochi"));
  const [mapType, setMapType] = useState("roadmap"); // 'roadmap' or 'satellite'
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);

  const changeTileLayer = (type) => {
    setMapType(type);
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(
      type === "satellite"
        ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
    );
  };

  useEffect(() => {
    if (!open) return;
    let isMounted = true;

    const initMap = async () => {
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!window.L) {
        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.id = "leaflet-js";
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
      }

      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;
      const L = window.L;

      // Bounds computed from the real outline (+ small padding)
      const outline = L.geoJSON({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [KERALA_BORDER_RING] },
      });
      const keralaBounds = outline.getBounds();
      const panBounds = keralaBounds.pad(0.35);

      const map = L.map(mapContainerRef.current, {
        center: keralaBounds.getCenter(),
        zoom: 7,
        maxBounds: panBounds,
        maxBoundsViscosity: 1.0,
        zoomControl: true,
        zoomSnap: 0.25,
      });

      // Fit first, then lock the minimum zoom so users can't zoom out past Kerala
      map.fitBounds(keralaBounds, { padding: [20, 20] });
      map.setMinZoom(map.getZoom()-1);
      map.setMaxZoom(13);

      const tiles = L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        attribution: "© Google Maps",
        maxZoom: 18,
      }).addTo(map);
      tileLayerRef.current = tiles;

      // Dedicated pane: above the tiles, below the markers
      map.createPane("keralaMask");
      const pane = map.getPane("keralaMask");
      pane.style.zIndex = 450;
      pane.style.pointerEvents = "none";

      // Inverted mask: huge rectangle with Kerala cut out as a hole
      const worldOuter = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
      L.geoJSON(
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [worldOuter, KERALA_BORDER_RING] },
        },
        {
          pane: "keralaMask",
          interactive: false,
          style: {
            fillColor: OUTSIDE_COLOR,
            fillOpacity: OUTSIDE_OPACITY,
            stroke: false,
            fillRule: "evenodd",
          },
        }
      ).addTo(map);

      // Glowing Kerala outline on top of the mask
      L.geoJSON(
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [KERALA_BORDER_RING] },
        },
        {
          pane: "keralaMask",
          interactive: false,
          style: {
            fill: false,
            color: BORDER_COLOR,
            weight: 2.5,
            opacity: 0.95,
            lineJoin: "round",
          },
        }
      ).addTo(map);

      // Coastal location markers (small pins + name labels)
      COASTAL_LOCATIONS.forEach((loc) => {
        const color = riskColor(loc.risk);
        const icon = L.divIcon({
          className: "custom-coastal-pin",
          html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 8px ${color};"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        const marker = L.marker([loc.lat, loc.lon], { icon }).addTo(map);
        marker.on("click", () => setSelectedZone(loc));
        // Name label next to the pin (hidden when zoomed far out, see CSS)
        marker.bindTooltip(`${loc.name}`, {
          permanent: true,
          direction: "left",
          offset: [-8, 0],
          className: "coastal-label",
        });
      });

      // Show labels only when zoomed in enough to avoid overlap
      const updateLabels = () => {
        map.getContainer().classList.toggle("hide-coastal-labels", map.getZoom() < 8.5);
      };
      updateLabels();
      map.on("zoomend", updateLabels);

      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 50);
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [open]);

  return (
    <>
      {open && (
        <div className="kerala-real-map-modal">
          <div className="map-modal-header">
            <div>
              <h3>🗺️ Kerala Coastal Navigator</h3>
              <small>Live map view — restricted to the Kerala state boundary</small>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div className="map-type-toggle">
                <button className={mapType === "roadmap" ? "active" : ""} onClick={() => changeTileLayer("roadmap")}>
                  Map
                </button>
                <button className={mapType === "satellite" ? "active" : ""} onClick={() => changeTileLayer("satellite")}>
                  Satellite
                </button>
              </div>
              <button className="map-modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>
          </div>

          <div className="map-modal-content">
            <div ref={mapContainerRef} className="real-map-canvas" />

            {selectedZone && (
              <div className="selected-zone-bar">
                <div className="zone-meta">
                  <span className="risk-tag" style={{ background: riskColor(selectedZone.risk) }}>
                    ● {selectedZone.risk.toUpperCase()} RISK
                  </span>
                  <b>📍 {selectedZone.name}</b>
                  <p>{selectedZone.district} District · {selectedZone.status}</p>
                </div>
                <div className="zone-stats">
                  <div>
                    <small>Wave Height</small>
                    <strong>{selectedZone.waves}</strong>
                  </div>
                  <div>
                    <small>Wind Speed</small>
                    <strong>{selectedZone.wind}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <button className="kerala-map-fab" onClick={() => setOpen(!open)} title="Open Kerala Coastal Map">
        {open ? "✕" : "🗺️"}
      </button>
    </>
  );
}

export default KeralaMap;