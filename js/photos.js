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
];
