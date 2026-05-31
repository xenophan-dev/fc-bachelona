// js/photos.js — photo metadata for El Álbum (photos.html).
// One entry per image; the gallery, date stamps, dots, filters, and lightbox
// all derive from these fields. See CLAUDE.md → "Photo intake workflow".
//
// Fields:
//   img       path to the image file (in assets/Photos/)
//   cap       caption (handwritten Caveat font)            — required
//   cat       category: "com"|"beb"|"act"|"crew", or an     — required
//             array for photos that span more than one
//   date      display date, e.g. "MAY 28"                   — required
//   time      capture time, e.g. "18:32" (or "" if unknown) — required-ish
//   day       "thu"|"fri"|"sat"|"sun" (derive from date)    — required
//   location  venue / neighbourhood                         — optional
//   rot       tilt angle in deg (auto-assigned)             — auto
//   taped     true for a tape accent (~1 in 4)              — auto

window.PHOTOS = [
  // Seed/test entry — proves the real-image pipeline end-to-end. José: give me
  // a real caption + category or say "remove the cat" and it's gone.
  {
    img: "assets/Photos/cat-in-bag.jpg",
    cap: "El supervisor de logística",
    cat: ["crew"],
    date: "MAY 28", time: "22:16", day: "thu",
    location: "Casa · pre-vuelo",
    rot: -2.5, taped: true,
  },

  // ─── Contramar · Thursday dinner (times approximate — EXIF stripped) ───
  {
    img: "assets/Photos/contramar-equipo.jpg",
    cap: "El equipo @ Contramar",
    cat: ["crew"],
    date: "MAY 28", time: "18:35", day: "thu",
    location: "Contramar, Roma Norte",
    rot: 1.8, taped: true,
  },
  {
    img: "assets/Photos/contramar-tiradito.jpg",
    cap: "Tiradito en salsa verde",
    cat: ["com"],
    date: "MAY 28", time: "18:48", day: "thu",
    location: "Contramar, Roma Norte",
    rot: -1.5,
  },
  {
    img: "assets/Photos/contramar-tostada-atun.jpg",
    cap: "Tostada de atún",
    cat: ["com"],
    date: "MAY 28", time: "18:52", day: "thu",
    location: "Contramar, Roma Norte",
    rot: 2.1,
  },
  {
    img: "assets/Photos/contramar-tacos-pastor.jpg",
    cap: "Tacos al pastor & pulpo",
    cat: ["com"],
    date: "MAY 28", time: "19:05", day: "thu",
    location: "Contramar, Roma Norte",
    rot: -2.0, taped: true,
  },
  {
    img: "assets/Photos/contramar-tacos-ensenada.jpg",
    cap: "Tacos de ensenada de camarón",
    cat: ["com"],
    date: "MAY 28", time: "19:14", day: "thu",
    location: "Contramar, Roma Norte",
    rot: 1.3,
  },

  // ─── Friday · Lucha Libre @ Arena México ───
  {
    img: "assets/Photos/lucha-arena-wide.jpg",
    cap: "Arena México · sold out",
    cat: ["act"],
    date: "MAY 29", time: "20:45", day: "fri",
    location: "Arena México, Doctores",
    rot: -1.8, taped: true,
  },
  {
    img: "assets/Photos/lucha-calavera-entrada.jpg",
    cap: "Calavera Jr. I · la entrada",
    cat: ["act"],
    date: "MAY 29", time: "20:55", day: "fri",
    location: "Arena México, Doctores",
    rot: 1.5,
  },
  {
    img: "assets/Photos/lucha-aniversario.jpg",
    cap: "Aniversario CMLL",
    cat: ["act"],
    date: "MAY 29", time: "21:00", day: "fri",
    location: "Arena México, Doctores",
    rot: -2.1,
  },
  {
    img: "assets/Photos/lucha-equipo-ringside.jpg",
    cap: "El equipo @ ringside",
    cat: ["crew", "act"],
    date: "MAY 29", time: "21:30", day: "fri",
    location: "Arena México, Doctores",
    rot: 2.0, taped: true,
  },
  {
    img: "assets/Photos/lucha-enmascarados.jpg",
    cap: "El equipo · enmascarados",
    cat: ["crew", "act"],
    date: "MAY 29", time: "21:45", day: "fri",
    location: "Arena México, Doctores",
    rot: 1.6, taped: true,
  },
  {
    img: "assets/Photos/lucha-ringside.jpg",
    cap: "Máscaras everywhere",
    cat: ["act"],
    date: "MAY 29", time: "22:15", day: "fri",
    location: "Arena México, Doctores",
    rot: -1.4,
  },

  // ─── Saturday · UCL Final + post-match @ Salón Malafama ───
  {
    img: "assets/Photos/malafama-ucl.jpg",
    cap: "UCL Final · Salón Malafama",
    cat: ["act"],
    date: "MAY 30", time: "10:30", day: "sat",
    location: "Salón Malafama, Roma Norte",
    rot: -1.6,
  },
  {
    img: "assets/Photos/malafama-equipo.jpg",
    cap: "FC Bachelona · post-match",
    cat: ["crew", "act"],
    date: "MAY 30", time: "12:15", day: "sat",
    location: "Salón Malafama, Roma Norte",
    rot: 1.9, taped: true,
  },

  // ─── Saturday · taco crawl ───
  {
    img: "assets/Photos/taco-pescadilla.jpg",
    cap: "Pescadilla · taco crawl",
    cat: ["com"],
    date: "MAY 30", time: "12:45", day: "sat",
    location: "Taco crawl · Roma / Condesa",
    rot: -1.7,
  },
  {
    img: "assets/Photos/taco-quesabirria.jpg",
    cap: "Quesabirria · jerseys & tacos",
    cat: ["com", "crew"],
    date: "MAY 30", time: "13:00", day: "sat",
    location: "Taco crawl · Roma / Condesa",
    rot: 2.2, taped: true,
  },
  {
    img: "assets/Photos/taco-carnitas.jpg",
    cap: "Carnitas en azul",
    cat: ["com"],
    date: "MAY 30", time: "13:30", day: "sat",
    location: "Taco crawl · Roma / Condesa",
    rot: -1.3,
  },

  // ─── Saturday · Handshake Speakeasy ───
  {
    img: "assets/Photos/handshake-equipo.jpg",
    cap: "El equipo @ Handshake",
    cat: ["crew", "beb"],
    date: "MAY 30", time: "18:05", day: "sat",
    location: "Handshake Speakeasy, Juárez",
    rot: 1.7, taped: true,
  },
  {
    img: "assets/Photos/handshake-cocktail.jpg",
    cap: "Cóctel firma · Handshake",
    cat: ["beb"],
    date: "MAY 30", time: "18:30", day: "sat",
    location: "Handshake Speakeasy, Juárez",
    rot: -2.0,
  },
  {
    img: "assets/Photos/handshake-fuego.jpg",
    cap: "El fuego · Handshake",
    cat: ["beb"],
    date: "MAY 30", time: "19:00", day: "sat",
    location: "Handshake Speakeasy, Juárez",
    rot: 1.4,
  },
  {
    img: "assets/Photos/paramo-chacalaca.jpg",
    cap: "Ceviche chacalaca · Páramo",
    cat: ["com"],
    date: "MAY 30", time: "19:40", day: "sat",
    location: "Páramo, Roma Norte",
    rot: -1.8,
  },
];
