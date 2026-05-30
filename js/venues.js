// js/venues.js — single source of truth for every pin on every page.
// Coordinates geocoded via OpenStreetMap Nominatim (May 2026). Venues without
// an OSM record use a best-guess neighbourhood coordinate flagged
// `representative: true` (popup addr ends in "· approx") — refine when the
// real address is known.
//
// Schema (see spec §5.2):
//   id, name, day, time, cat, lat, lng, addr,
//   reserved?, nightclub?, major?, maybe?, dayOnly?, hq?, representative?
//
// cat: "act" | "beb" | "com" | "air" | "stay"
//   stay = lodging / home base (Airbnb HQ, crash pads). Day-agnostic, own
//   filter toggle + colour. `hq:true` marks the trip's main base, which also
//   appears on the Fri/Sat day mini-maps as the place the crew returns to.
//
// dayOnly venues render on a day mini-map only and are excluded from the
// master map.

(function () {
  const VENUES = [
    // ─────────────────── STAY (home base / crash) ───────────────────
    {
      id: "airbnb-hq", name: "Airbnb · HQ",
      cat: "stay", hq: true,
      lat: 19.41738, lng: -99.15676,
      addr: "Guanajuato 238, Roma Norte · home base",
    },
    {
      id: "vishnu", name: "Vishnu's · crash",
      day: "thu", time: "ARRIVAL", cat: "stay",
      lat: 19.41840, lng: -99.16142,
      addr: "Jalapa 101, Roma Norte · sleep on arrival",
    },

    // ─────────────────── THURSDAY ───────────────────
    {
      id: "mex-arrivals", name: "MEX · Benito Juárez T1",
      day: "thu", time: "ARRIVALS", cat: "air", major: true,
      lat: 19.4361, lng: -99.0719,
      addr: "Terminal 1, Aeropuerto Internacional Benito Juárez",
      representative: true,
    },
    {
      id: "filigrana", name: "Filigrana",
      day: "thu", time: "13:00", cat: "com", reserved: true,
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
      addr: "Roma Norte · late eats · approx",
      representative: true,
    },

    // ─────────────────── FRIDAY ───────────────────
    {
      id: "museum-walk", name: "Museum Walk",
      day: "fri", time: "11:00", cat: "act", dayOnly: true,
      lat: 19.4185, lng: -99.1660,
      addr: "Roma Norte → Reforma · approx",
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
      addr: "Bosque de Chapultepec · approx",
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
      day: "fri", time: "17:30", cat: "com", reserved: true,
      lat: 19.41641, lng: -99.15671,
      addr: "Zacatecas 126, Roma Norte",
    },
    {
      id: "arena-mexico", name: "ARENA MÉXICO · LUCHA LIBRE",
      day: "fri", time: "20:30", cat: "act", major: true, reserved: true,
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
      id: "torito-lucas", name: "UCL Final · venue TBD",
      day: "sat", time: "10:00", cat: "act", major: true,
      lat: 19.41775, lng: -99.16193,
      addr: "likely Salón Malafama (Álvaro Obregón) — or Dog House / Torito Lucas · approx",
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
      addr: "Roma / Condesa · multi-stop · approx",
      representative: true,
    },
    {
      id: "siesta", name: "Siesta",
      day: "sat", time: "14:00", cat: "act",
      lat: 19.41738, lng: -99.15676,
      addr: "Airbnb HQ · Guanajuato 238 · rest",
      representative: true,
    },
    {
      id: "handshake", name: "Handshake Speakeasy",
      day: "sat", time: "18:00", cat: "beb",
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
      day: "sat", time: "19:30", cat: "com", reserved: true,
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

    // ─────────────────── MAYBES · DRINKS ───────────────────
    { id: "balmori",        name: "Balmori Rooftop",      maybe: true, cat: "beb", lat: 19.41878, lng: -99.16015, addr: "Orizaba 101, Roma Norte · rooftop bar" },
    { id: "cueva",          name: "Cueva",                 maybe: true, cat: "beb", lat: 19.41324, lng: -99.15753, addr: "Calle Chiapas, Roma Norte · bar" },
    { id: "cafe-de-nadie",  name: "Café de Nadie",         maybe: true, cat: "beb", nightclub: true, lat: 19.42310, lng: -99.16242, addr: "Jalapa, Roma Norte · vinyl bar" },
    { id: "bar-oriente",    name: "Bar Oriente",           maybe: true, cat: "beb", nightclub: true, lat: 19.41996, lng: -99.16533, addr: "Durango, Roma Norte" },
    { id: "hotel-rooftop-condesa", name: "Hotel rooftop Condesa", maybe: true, cat: "beb", lat: 19.4127, lng: -99.1747, addr: "Condesa · rooftop · approx", representative: true },
    { id: "bar-mauro",      name: "Bar Mauro",             maybe: true, cat: "beb", lat: 19.41947, lng: -99.15934, addr: "Tabasco 149, Roma Norte" },
    { id: "bijou",          name: "Bijou Drinkery Room",   maybe: true, cat: "beb", lat: 19.41290, lng: -99.16782, addr: "Av. Sonora 189-B, Hipódromo" },
    { id: "kaito-del-valle", name: "Kaito del Valle",      maybe: true, cat: "beb", lat: 19.42707, lng: -99.16244, addr: "Hamburgo 70B, Juárez" },

    // ─────────────────── MAYBES · NIGHTLIFE (drinks + nightclub) ───────────────────
    { id: "loo-loo-studio", name: "Loo Loo Studio",        maybe: true, cat: "beb", nightclub: true, lat: 19.42429, lng: -99.16737, addr: "Londres 195, Juárez" },
    { id: "funk-club",      name: "Funk Club",             maybe: true, cat: "beb", nightclub: true, lat: 19.41024, lng: -99.16751, addr: "Av. Insurgentes Sur 377, Hipódromo" },
    { id: "desconforme",    name: "Desconforme",           maybe: true, cat: "beb", nightclub: true, lat: 19.4205, lng: -99.1518, addr: "Roma / Doctores · approx", representative: true },

    // ─────────────────── MAYBES · FOOD ───────────────────
    { id: "vilsito",            name: "El Vilsito",                 maybe: true, cat: "com", lat: 19.38931, lng: -99.15276, addr: "Petén, Narvarte · al pastor" },
    { id: "los-parados",        name: "Los Parados",                maybe: true, cat: "com", lat: 19.40562, lng: -99.16115, addr: "Av. Monterrey 333, Roma Sur · tacos" },
    { id: "cucuyos",            name: "Los Cocuyos",                maybe: true, cat: "com", lat: 19.43041, lng: -99.13873, addr: "Bolívar 56, Centro · tacos" },
    { id: "el-jarocho",         name: "Taquería El Jarocho",        maybe: true, cat: "com", lat: 19.41123, lng: -99.16601, addr: "Tapachula 94, Roma Norte · tacos" },
    { id: "el-paisa",           name: "Tacos El Paisa",             maybe: true, cat: "com", lat: 19.35541, lng: -99.09922, addr: "Calz. Ermita Iztapalapa · tacos" },
    { id: "pujol",              name: "Pujol",                      maybe: true, cat: "com", lat: 19.43229, lng: -99.19466, addr: "Tennyson 133, Polanco · fine dining" },
    { id: "los-carinitos",      name: "Cariñito Tacos",             maybe: true, cat: "com", lat: 19.41738, lng: -99.15676, addr: "Guanajuato 53, Roma Norte · tacos" },
    { id: "tacos-del-valle",    name: "Tacos del Valle",            maybe: true, cat: "com", lat: 19.41792, lng: -99.16061, addr: "Av. Álvaro Obregón 130, Roma Norte" },
    { id: "consentidos-del-barrio", name: "Consentidos del Barrio", maybe: true, cat: "com", lat: 19.37465, lng: -99.17773, addr: "Manzanas 27B, Tlacoquemecatl del Valle" },
    { id: "la-89",              name: "La 89",                      maybe: true, cat: "com", lat: 19.42005, lng: -99.15854, addr: "Colima 134, Roma Norte" },
    { id: "los-alexis",         name: "Los Alexis",                 maybe: true, cat: "com", lat: 19.41333, lng: -99.15763, addr: "Chiapas 46, Roma Norte" },
    { id: "califa-de-leon",     name: "Tacos El Califa de León",    maybe: true, cat: "com", lat: 19.44116, lng: -99.15908, addr: "Av. Ribera de San Cosme 56, San Rafael" },
    { id: "canasta-especiales", name: "Tacos de Canasta Los Especiales", maybe: true, cat: "com", lat: 19.43061, lng: -99.14461, addr: "Ayuntamiento 48, Centro" },
    { id: "hola-del-guero",     name: "Tacos Hola El Güero",        maybe: true, cat: "com", lat: 19.41176, lng: -99.17159, addr: "Ámsterdam 135, Hipódromo" },
    { id: "maizajo",            name: "Maizajo",                    maybe: true, cat: "com", lat: 19.41494, lng: -99.17814, addr: "Fernando Montes de Oca 113, Condesa" },
    { id: "castacan",           name: "Castacán",                   maybe: true, cat: "com", lat: 19.42022, lng: -99.17452, addr: "Puebla 387, Roma Norte" },
    { id: "los-milanesos",      name: "Los Milanesos",              maybe: true, cat: "com", lat: 19.43832, lng: -99.19894, addr: "Av. Ejército Nacional 914, Polanco" },
    { id: "ricos-tacos-toluca", name: "Ricos Tacos Toluca",         maybe: true, cat: "com", lat: 19.43123, lng: -99.14235, addr: "C. López 103, Centro" },
    { id: "tacos-charly",       name: "Tacos Charly",               maybe: true, cat: "com", lat: 19.43166, lng: -99.19361, addr: "Aristóteles 124, Polanco" },
    { id: "el-gran-abanico",    name: "Taquería El Gran Abanico",   maybe: true, cat: "com", lat: 19.41490, lng: -99.13131, addr: "Gutiérrez Nájera, Tránsito" },
    { id: "siembra-tortilleria", name: "Siembra Taquería",          maybe: true, cat: "com", lat: 19.43443, lng: -99.18758, addr: "Av. Isaac Newton 256, Polanco" },
    { id: "orinoco",            name: "Taquería Orinoco",           maybe: true, cat: "com", lat: 19.41780, lng: -99.16329, addr: "Av. Álvaro Obregón 179, Roma Norte · tacos 24h" },
    { id: "mi-compa-chava",     name: "Mi Compa Chava",             maybe: true, cat: "com", lat: 19.41521, lng: -99.16216, addr: "Zacatecas, Roma Norte · mariscos" },
    { id: "once-mil",           name: "La Once Mil",                maybe: true, cat: "com", lat: 19.4150, lng: -99.1720, addr: "Condesa · tacos · approx", representative: true },
    { id: "el-cardenal",        name: "El Cardenal",                maybe: true, cat: "com", lat: 19.43370, lng: -99.13524, addr: "Palma 23, Centro · near museum" },

    // ─────────────────── MAYBES · BREAKFAST (food) ───────────────────
    { id: "lalo",               name: "Lalo!",                      maybe: true, cat: "com", lat: 19.41540, lng: -99.16240, addr: "Zacatecas 173, Roma Norte · breakfast" },
    { id: "madre-cafe",         name: "Madre Café",                 maybe: true, cat: "com", lat: 19.41707, lng: -99.15960, addr: "Orizaba, Roma Norte · breakfast" },
    { id: "peltre",             name: "Peltre Lonchería",           maybe: true, cat: "com", lat: 19.40792, lng: -99.17448, addr: "Saltillo 73, Hipódromo · café/breakfast" },
    { id: "cerrajeria",         name: "Restaurante Cerrajería",     maybe: true, cat: "com", lat: 19.41688, lng: -99.16544, addr: "Av. Álvaro Obregón 228, Roma Norte · breakfast" },

    // ─────────────────── MAYBES · ACTIVITIES ───────────────────
    { id: "templo-mayor",   name: "Templo Mayor",          maybe: true, cat: "act", lat: 19.43432, lng: -99.13177, addr: "Seminario 8, Centro · ruins (E of Zócalo)" },
    { id: "zocalo",         name: "Zócalo",                maybe: true, cat: "act", lat: 19.43250, lng: -99.13225, addr: "Plaza de la Constitución, Centro" },
    { id: "bellas-artes",   name: "Bellas Artes",          maybe: true, cat: "act", lat: 19.43550, lng: -99.14126, addr: "Av. Juárez, Centro · museum" },
    { id: "palacio-postal", name: "Palacio Postal",        maybe: true, cat: "act", lat: 19.43566, lng: -99.14028, addr: "Tacuba 1, Centro · postal palace" },
    { id: "hat-belt-shopping", name: "Hat & Belt Shopping", maybe: true, cat: "act", lat: 19.4338, lng: -99.1402, addr: "Centro · walk-back shopping · approx", representative: true },
  ];

  const DAY_LABEL = { thu: "THU · 28", fri: "FRI · 29", sat: "SAT · 30", sun: "SUN · 31" };
  const CAT_LABEL = { act: "ACTIVIDAD", beb: "BEBIDA", com: "COMIDA", air: "AIRPORT", stay: "AIRBNB" };

  const HELPERS = {
    DAY_LABEL,
    CAT_LABEL,
    // Day mini-map: that day's venues (incl. dayOnly fillers), plus the HQ on
    // Fri/Sat where the schedule has the crew returning to rest.
    forDay(day) {
      const dayVenues = VENUES.filter(v => v.day === day && !v.maybe);
      const hq = (day === "fri" || day === "sat") ? VENUES.filter(v => v.hq) : [];
      return dayVenues.concat(hq);
    },
    // Master map: every pin except dayOnly fillers.
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
