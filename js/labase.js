// js/labase.js — La Base dashboard logic: Now/Next + countdown, weather, FX.
// Pure helpers are exposed on window.LABASE for testing; render() wires the DOM.

(function () {
  const TZ = "America/Mexico_City";
  const DAY_ORDER = { thu: 0, fri: 1, sat: 2, sun: 3 };
  const DATE_DAY = { "2026-05-28": "thu", "2026-05-29": "fri", "2026-05-30": "sat", "2026-05-31": "sun" };
  const DAY_LABEL = { thu: "THU · MAY 28", fri: "FRI · MAY 29", sat: "SAT · MAY 30", sun: "SUN · MAY 31" };

  // Parse a venue time string to minutes-since-midnight, or null if not a clock time.
  function parseTime(t) {
    if (!t) return null;
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
    if (m) return (+m[1]) * 60 + (+m[2]);
    const u = String(t).trim().toUpperCase();
    if (u === "LATE") return 23 * 60 + 30;
    return null; // ARRIVALS / DEPARTURES / ARRIVAL → not part of the leave-for timeline
  }

  // Sorted timeline of scheduled stops with a real clock time.
  function buildTimeline(venues) {
    const list = (venues || window.VENUES).filter(
      v => v.day && !v.maybe && !v.dayOnly && v.cat !== "stay"
    );
    const events = [];
    for (const v of list) {
      const mins = parseTime(v.time);
      if (mins == null) continue;
      events.push({ id: v.id, name: v.name, day: v.day, time: v.time, cat: v.cat,
        lat: v.lat, lng: v.lng, addr: v.addr, abs: DAY_ORDER[v.day] * 1440 + mins });
    }
    events.sort((a, b) => a.abs - b.abs);
    return events;
  }

  // CDMX-local "now" as absolute minutes within the trip (Thu 00:00 = 0).
  // Returns -Infinity before the trip, +Infinity after.
  function nowAbs(nowDate) {
    const d = nowDate || new Date();
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const p = Object.fromEntries(fmt.formatToParts(d).map(x => [x.type, x.value]));
    const dateStr = `${p.year}-${p.month}-${p.day}`;
    const mins = (+p.hour) * 60 + (+(p.minute));
    const day = DATE_DAY[dateStr];
    if (day == null) return dateStr < "2026-05-28" ? -Infinity : Infinity;
    return DAY_ORDER[day] * 1440 + mins;
  }

  function haversineKm(a, b) {
    const R = 6371, toR = x => x * Math.PI / 180;
    const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  }
  // Rough city estimates: walking ~4.5 km/h, driving/Uber ~16 km/h with traffic.
  function travelEst(a, b) {
    const km = haversineKm(a, b);
    return { km, walk: Math.max(1, Math.round(km / 4.5 * 60)), drive: Math.max(1, Math.round(km / 16 * 60)) };
  }

  // current = last event already started; next = first upcoming event.
  function compute(nowDate, venues) {
    const tl = buildTimeline(venues);
    const na = nowAbs(nowDate);
    let current = null, next = null;
    for (const e of tl) { if (e.abs <= na) current = e; else { next = e; break; } }
    let travel = null, leaveByAbs = null;
    if (next && current) {
      travel = travelEst(current, next);
      leaveByAbs = next.abs - travel.walk;
    }
    return { tl, na, current, next, travel, leaveByAbs,
      state: na === -Infinity ? "pre" : na === Infinity ? "post" : "live" };
  }

  function fmtCountdown(mins) {
    if (mins <= 0) return "00:00";
    const h = Math.floor(mins / 60), m = mins % 60;
    return (h > 0 ? h + "h " : "") + String(m).padStart(h > 0 ? 2 : 1, "0") + "m";
  }

  window.LABASE = { parseTime, buildTimeline, nowAbs, haversineKm, travelEst, compute, fmtCountdown, DAY_LABEL };

  // ───────────────────────── DOM rendering ─────────────────────────
  if (typeof document === "undefined") return;

  function renderNowNext() {
    const r = compute();
    const el = document.getElementById("nownext");
    if (!el) return;

    if (r.state === "pre") {
      const first = r.tl[0];
      el.innerHTML = card("TRIP STARTS SOON", first ? first.name : "—",
        first ? DAY_LABEL[first.day] + " · " + first.time : "", "", "");
      return;
    }
    if (r.state === "post" || !r.next) {
      el.innerHTML = card("THAT'S A WRAP", "Hasta la próxima",
        r.current ? "last stop · " + r.current.name : "", "", "");
      return;
    }

    const cur = r.current;
    const nx = r.next;
    const minsToNext = nx.abs - r.na;
    const minsToLeave = r.leaveByAbs != null ? r.leaveByAbs - r.na : null;

    const nowBlock =
      '<div class="nn-block nn-now">' +
        '<div class="nn-lbl">AHORA · NOW</div>' +
        '<div class="nn-name">' + (cur ? cur.name : "Downtime") + '</div>' +
        '<div class="nn-meta">' + (cur ? DAY_LABEL[cur.day] + " · " + cur.time : "between stops") + '</div>' +
      '</div>';

    // Only frame as "leave by" when the next stop is same-day and within ~4h;
    // for big/overnight gaps a leave-by countdown is meaningless.
    const sameDaySoon = cur && nx && cur.day === nx.day && minsToNext <= 240;
    let big, sub;
    if (sameDaySoon && minsToLeave <= 0) {
      big = "LEAVE NOW";
      sub = "~" + r.travel.walk + " min walk · " + r.travel.km.toFixed(1) + " km";
    } else if (sameDaySoon) {
      big = "LEAVE IN " + fmtCountdown(minsToLeave);
      sub = "~" + r.travel.walk + " min walk (or ~" + r.travel.drive + " min ride) · " + r.travel.km.toFixed(1) + " km";
    } else {
      big = "STARTS IN " + fmtCountdown(minsToNext);
      sub = cur && nx && cur.day !== nx.day ? "next up " + DAY_LABEL[nx.day].split(" · ")[0] : "";
    }

    const nextBlock =
      '<div class="nn-block nn-next">' +
        '<div class="nn-lbl">SIGUIENTE · NEXT</div>' +
        '<div class="nn-name">' + nx.name + '</div>' +
        '<div class="nn-meta">' + DAY_LABEL[nx.day] + " · " + nx.time + " · " + nx.addr + '</div>' +
        '<div class="nn-timer" id="nnTimer">' + big + '</div>' +
        (sub ? '<div class="nn-sub">' + sub + '</div>' : '') +
      '</div>';

    el.innerHTML = nowBlock + nextBlock;
  }

  function card(lbl, name, meta) {
    return '<div class="nn-block nn-next"><div class="nn-lbl">' + lbl + '</div>' +
      '<div class="nn-name">' + name + '</div>' +
      (meta ? '<div class="nn-meta">' + meta + '</div>' : '') + '</div>';
  }

  // ── Weather (Open-Meteo, keyless) ──
  const WMO = {
    0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Snow", 73: "Snow", 75: "Snow",
    80: "Showers", 81: "Showers", 82: "Heavy showers", 95: "Thunderstorm", 96: "Storm", 99: "Storm",
  };
  const cToF = c => Math.round(c * 9 / 5 + 32);
  function renderWeather() {
    const el = document.getElementById("weather");
    if (!el) return;
    const url = "https://api.open-meteo.com/v1/forecast?latitude=19.4326&longitude=-99.1332" +
      "&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min" +
      "&timezone=America%2FMexico_City&forecast_days=4";
    fetch(url).then(r => r.json()).then(d => {
      const c = d.current, days = d.daily;
      const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      let html = '<div class="wx-now"><span class="wx-temp">' + Math.round(c.temperature_2m) + '°C</span>' +
        '<span class="wx-tempf">' + cToF(c.temperature_2m) + '°F</span>' +
        '<span class="wx-desc">' + (WMO[c.weather_code] || "—") + '</span></div>';
      html += '<div class="wx-days">';
      for (let i = 0; i < days.time.length; i++) {
        const dn = dayNames[new Date(days.time[i] + "T12:00:00").getDay()];
        html += '<div class="wx-day"><div class="wx-dn">' + dn + '</div>' +
          '<div class="wx-hl">' + Math.round(days.temperature_2m_max[i]) + '°</div>' +
          '<div class="wx-lo">' + Math.round(days.temperature_2m_min[i]) + '°</div>' +
          '<div class="wx-c">' + (WMO[days.weather_code[i]] || "") + '</div></div>';
      }
      html += '</div>';
      el.innerHTML = html;
    }).catch(() => { el.innerHTML = '<div class="wx-err">Weather unavailable offline — check back with signal.</div>'; });
  }

  // ── Converter (Frankfurter, keyless; fallback rate if offline) ──
  const FALLBACK_RATE = 17.0; // USD→MXN approx; used only if the API is unreachable
  function renderConverter() {
    const usd = document.getElementById("usd"), mxn = document.getElementById("mxn"), note = document.getElementById("fxNote");
    if (!usd || !mxn) return;
    let rate = FALLBACK_RATE, live = false;
    const setNote = () => { note.textContent = live
      ? "1 USD = " + rate.toFixed(2) + " MXN · live rate"
      : "1 USD ≈ " + rate.toFixed(2) + " MXN · offline estimate"; };
    const fromUsd = () => { const v = parseFloat(usd.value); mxn.value = isNaN(v) ? "" : (v * rate).toFixed(2); };
    const fromMxn = () => { const v = parseFloat(mxn.value); usd.value = isNaN(v) ? "" : (v / rate).toFixed(2); };
    usd.addEventListener("input", fromUsd);
    mxn.addEventListener("input", fromMxn);
    usd.value = "100"; fromUsd(); setNote();
    // open.er-api.com: keyless + CORS-enabled, updated daily.
    fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json()).then(d => {
      if (d && d.rates && d.rates.MXN) { rate = d.rates.MXN; live = true; fromUsd(); setNote(); }
    }).catch(() => {});
  }

  function tick() { renderNowNext(); }
  document.addEventListener("DOMContentLoaded", () => {
    renderNowNext();
    renderWeather();
    renderConverter();
    setInterval(tick, 30 * 1000); // refresh Now/Next every 30s
  });
})();
