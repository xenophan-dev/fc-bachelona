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
];
