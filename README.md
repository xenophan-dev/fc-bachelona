# CDMX Bach '26

Static, mobile-first itinerary site for Edwin's bachelor party in Mexico City (May 28–31, 2026).

**Live:** https://www.fcbachelona.com (apex `fcbachelona.com` redirects to www)

## Pages

- `index.html` — landing
- `thursday.html` — arrivals & Contramar (vintage boarding passes)
- `friday.html` — Lucha Libre night (wrestling fight card)
- `saturday.html` — UCL Final & Departamento (match-day programme)
- `sunday.html` — wheels up (telegram)
- `map.html` — every pin, filterable by day / type / nightclubs / reserved / maybes

## Data

`js/venues.js` is the single source of truth for every pin. Every page that renders a map reads from `window.VENUES`. Coordinates are real (Nominatim-geocoded).

## Local dev

```
python3 -m http.server 8080
open http://localhost:8080
```

## Deploy

The repo is linked to the existing Vercel project `cdmxbach`.

```
vercel deploy --prod
```

## Stack

Plain HTML/CSS/JS. No framework, no build step. Leaflet 1.9.4 + OpenStreetMap tiles. Hosted on Vercel.
