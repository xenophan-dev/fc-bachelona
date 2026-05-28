// js/venues.js — single source of truth for every pin on every page.
// Coordinates geocoded via OpenStreetMap Nominatim (May 2026). A handful of
// venues without OSM entries use representative neighbourhood coords; those
// are tagged with `representative: true` so future contributors know.
//
// Schema (see spec §5.2):
//   id, name, day, time, cat, lat, lng, addr,
//   reserved?, nightclub?, major?, maybe?, dayOnly?, representative?
//
// `dayOnly` venues (Museum Walk, Airbnb rest stops) render on a day mini-map
// only and are excluded from the master map. They are NOT among the spec's
// canonical 23 going pins — they're route-visualization fillers carried over
// from the mockups.

(function () {
  const VENUES = [
    // ─────────────────── THURSDAY ───────────────────
    {
      id: "mex-arrivals", name: "MEX · Benito Juárez T1",
      day: "thu", time: "ARRIVALS", cat: "air", major: true,
      lat: 19.4361, lng: -99.0719,
      addr: "Terminal 1, Aeropuerto Internacional Benito Juárez",
      representative: true, // T1 anchor; no single OSM node
    },
    {
      id: "filigrana", name: "Filigrana",
      day: "thu", time: "13:00", cat: "com",
      lat: 19.41757, lng: -99.17402,
      addr: "Veracruz 62, Roma Norte",
    },
    {
      id: "contramar", name: "Contramar",
      day: "thu", time: "18:00", cat: "com", reserved: true,
      lat: 19.41961, lng: -99.16723,
      addr: "Calle de Durango 200, Roma Norte",
    },
    {
      id: "tacos-chanito", name: "Tacos Chanito",
      day: "thu", time: "LATE", cat: "com",
      lat: 19.4144, lng: -99.1622,
      addr: "Roma Norte · late eats",
      representative: true, // small taco stand; no OSM entry
    },

    // ─────────────────── FRIDAY ───────────────────
    {
      id: "museum-walk", name: "Museum Walk",
      day: "fri", time: "11:00", cat: "act", dayOnly: true,
      lat: 19.4185, lng: -99.1660,
      addr: "Roma Norte → Reforma",
      representative: true,
    },
    {
      id: "museo-antro", name: "Museo Nac. de Antropología",
      day: "fri", time: "11:30", cat: "act",
      lat: 19.42615, lng: -99.18665,
      addr: "Av. Paseo de la Reforma s/n, Bosque de Chapultepec",
    },
    {
      id: "cablecar-chapultepec", name: "Cablecar · Chapultepec",
      day: "fri", time: "12:30", cat: "act",
      lat: 19.4193, lng: -99.1822,
      addr: "Bosque de Chapultepec",
      representative: true,
    },
    {
      id: "airbnb-fri", name: "Airbnb (rest)",
      day: "fri", time: "14:00", cat: "act", dayOnly: true,
      lat: 19.4173, lng: -99.1614,
      addr: "Roma Norte · HQ",
      representative: true,
    },
    {
      id: "limantour", name: "Licorería Limantour",
      day: "fri", time: "16:00", cat: "beb", reserved: true,
      lat: 19.41813, lng: -99.15941,
      addr: "Av. Álvaro Obregón 106, Roma Norte",
    },
    {
      id: "broka", name: "Broka",
      day: "fri", time: "17:30", cat: "com",
      lat: 19.41641, lng: -99.15671,
      addr: "Zacatecas 126, Roma Norte",
    },
    {
      id: "arena-mexico", name: "ARENA MÉXICO · LUCHA LIBRE",
      day: "fri", time: "20:30", cat: "act", major: true,
      lat: 19.42461, lng: -99.15200,
      addr: "Dr. Lavista 189, Doctores · MAIN EVENT",
    },
    {
      id: "supra-rooftop", name: "Supra Rooftop",
      day: "fri", time: "22:30", cat: "beb",
      lat: 19.41817, lng: -99.16189,
      addr: "Av. Álvaro Obregón 151, Roma Norte",
    },
    {
      id: "hamburguesas-parrilla", name: "Hamburguesas a la Parrilla",
      day: "fri", time: "LATE", cat: "com",
      lat: 19.42103, lng: -99.15543,
      addr: "Colima, Roma Norte · late eats",
    },

    // ─────────────────── SATURDAY ───────────────────
    {
      id: "panaderia-rosetta", name: "Panadería Rosetta",
      day: "sat", time: "08:30", cat: "com",
      lat: 19.41982, lng: -99.15970,
      addr: "Colima 166, Roma Norte",
    },
    {
      id: "torito-lucas", name: "Torito Lucas (UCL Final)",
      day: "sat", time: "10:00", cat: "act", major: true,
      lat: 19.4136, lng: -99.1612,
      addr: "Roma Norte · sports bar · FEATURED FIXTURE",
      representative: true,
    },
    {
      id: "tacos-don-juan", name: "Tacos Don Juan",
      day: "sat", time: "12:00", cat: "com",
      lat: 19.41410, lng: -99.17364,
      addr: "Atlixco 121, Condesa · quesabirria",
    },
    {
      id: "taco-crawl", name: "Taco Crawl",
      day: "sat", time: "12:30", cat: "com",
      lat: 19.4150, lng: -99.1670,
      addr: "Roma / Condesa · multi-stop",
      representative: true, // multi-stop; pin set to a representative location
    },
    {
      id: "mezcal-tasting", name: "Mezcal Tasting",
      day: "sat", time: "14:00", cat: "beb",
      lat: 19.4180, lng: -99.1610,
      addr: "Roma Norte · TBD · book ahead",
      representative: true,
    },
    {
      id: "airbnb-sat", name: "Airbnb (rest)",
      day: "sat", time: "16:00", cat: "act", dayOnly: true,
      lat: 19.4173, lng: -99.1614,
      addr: "Roma Norte · HQ",
      representative: true,
    },
    {
      id: "handshake", name: "Handshake Speakeasy",
      day: "sat", time: "18:00", cat: "beb", reserved: true,
      lat: 19.42570, lng: -99.16534,
      addr: "Amberes 65, Juárez · book ahead",
    },
    {
      id: "tlecan", name: "Tlecan",
      day: "sat", time: "18:30", cat: "beb",
      lat: 19.41691, lng: -99.16547,
      addr: "Av. Álvaro Obregón 228, Roma Norte · mezcal bar",
    },
    {
      id: "paramo", name: "Paramo",
      day: "sat", time: "19:30", cat: "com",
      lat: 19.41418, lng: -99.16263,
      addr: "Yucatán 84, Roma Norte",
    },
    {
      id: "departamento", name: "Departamento",
      day: "sat", time: "23:00", cat: "beb", nightclub: true, major: true,
      lat: 19.42536, lng: -99.16069,
      addr: "Havre 71, Juárez",
    },

    // ─────────────────── SUNDAY ───────────────────
    {
      id: "el-hidalguense", name: "El Hidalguense",
      day: "sun", time: "13:00", cat: "com",
      lat: 19.40982, lng: -99.16521,
      addr: "Campeche 155, Roma Sur · goat birria",
    },
    {
      id: "mex-departures", name: "MEX · Benito Juárez T1",
      day: "sun", time: "DEPARTURES", cat: "air", major: true,
      lat: 19.4361, lng: -99.0719,
      addr: "Terminal 1 · wheels up",
      representative: true,
    },

    // ─────────────────── MAYBES (backup spots) ───────────────────
    { id: "balmori",        name: "Balmori Rooftop",      maybe: true, cat: "beb", lat: 19.41878, lng: -99.16015, addr: "Orizaba 101, Roma Norte · rooftop bar" },
    { id: "cueva",          name: "Cueva",                 maybe: true, cat: "beb", lat: 19.41324, lng: -99.15753, addr: "Calle Chiapas, Roma Norte · bar" },
    { id: "once-mil",       name: "La Once Mil",           maybe: true, cat: "com", lat: 19.4150,  lng: -99.1720,  addr: "Condesa · tacos", representative: true },
    { id: "orinoco",        name: "Taquería Orinoco",      maybe: true, cat: "com", lat: 19.41780, lng: -99.16329, addr: "Av. Álvaro Obregón 179, Roma Norte · tacos 24h" },
    { id: "mi-compa-chava", name: "Mi Compa Chava",        maybe: true, cat: "com", lat: 19.41521, lng: -99.16216, addr: "Zacatecas, Roma Norte · seafood" },
    { id: "cafe-de-nadie",  name: "Café de Nadie",         maybe: true, cat: "beb", lat: 19.42310, lng: -99.16242, addr: "Jalapa, Roma Norte · vinyl bar" },
    { id: "bar-oriente",    name: "Bar Oriente",           maybe: true, cat: "beb", lat: 19.41996, lng: -99.16533, addr: "Durango, Roma Norte" },
    { id: "hotel-rooftop-condesa", name: "Hotel rooftop Condesa", maybe: true, cat: "beb", lat: 19.4127, lng: -99.1747, addr: "Condesa · rooftop", representative: true },
    { id: "el-cardenal",    name: "El Cardenal",           maybe: true, cat: "com", lat: 19.43370, lng: -99.13524, addr: "Palma 23, Centro · classic Mexican" },
    { id: "templo-mayor",   name: "Templo Mayor",          maybe: true, cat: "act", lat: 19.43432, lng: -99.13177, addr: "Seminario 8, Centro Histórico · ruins" },
    { id: "bellas-artes",   name: "Bellas Artes",          maybe: true, cat: "act", lat: 19.43550, lng: -99.14126, addr: "Av. Juárez, Centro · museum" },
    { id: "zocalo",         name: "Zócalo",                maybe: true, cat: "act", lat: 19.43250, lng: -99.13225, addr: "Plaza de la Constitución, Centro" },
  ];

  const DAY_LABEL = { thu: "THU · 28", fri: "FRI · 29", sat: "SAT · 30", sun: "SUN · 31" };
  const CAT_LABEL = { act: "ACTIVIDAD", beb: "BEBIDA", com: "COMIDA", air: "AIRPORT" };

  const HELPERS = {
    DAY_LABEL,
    CAT_LABEL,
    // All venues for a given day, excluding maybes. Includes dayOnly fillers.
    forDay(day) {
      return VENUES.filter(v => v.day === day && !v.maybe);
    },
    // Master-map view: every going pin + every maybe pin, but NOT dayOnly fillers.
    forMaster() {
      return VENUES.filter(v => !v.dayOnly);
    },
    byId(id) {
      return VENUES.find(v => v.id === id);
    },
    googleMapsUrl(v) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name + " " + v.addr)}`;
    },
  };

  window.VENUES = VENUES;
  window.VENUE_HELPERS = HELPERS;
})();
