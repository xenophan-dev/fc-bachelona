# CDMX Bach '26 — project notes for Claude Code

Static, mobile-first itinerary site for Edwin's bachelor party in Mexico City
(May 28–31, 2026). Plain HTML/CSS/JS, no framework, no build step. Deployed to
the Vercel project **cdmxbach**, live at **https://www.fcbachelona.com**.

- Venue data: `js/venues.js` (`window.VENUES` + `window.VENUE_HELPERS`) is the
  single source of truth for every map pin. All map pages read from it.
- Photo data: `js/photos.js` (`window.PHOTOS`) drives the El Álbum gallery
  (`photos.html`). Image files live in `assets/Photos/`.
- Expense data: `js/expenses.js` (`window.CREW` + `window.EXPENSES`) is the
  committed **fallback snapshot**. When the API is provisioned, La Cuenta reads
  live data from Vercel KV via `/api/expenses.mjs`; balances + settlement
  computed in `js/cuenta.js`. The crew can self-add expenses in natural language
  ("Mike got drinks for Brian and me, ~$600") — Claude Haiku parses it and they
  confirm before it's saved.

## La Cuenta backend (/api/expenses.mjs)

A Node serverless function. Degrades gracefully: with no env vars it returns
`source:"static"` and the page falls back to `js/expenses.js`, so the site
never breaks. To turn on self-serve adds, set these in the Vercel project
(Settings → Environment Variables), then redeploy:

- `ANTHROPIC_API_KEY` — Claude API key (parses the natural-language expense).
- `CREW_PIN` — shared code the crew enters to add an expense.
- Vercel KV: provision **Storage → KV** in the Vercel dashboard and link it to
  the `cdmxbach` project. It auto-injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`
  (the function also accepts `UPSTASH_REDIS_REST_URL` / `_TOKEN`).

KV is seeded from the `SEED` array in the function on first read (mirrors the
current expenses.js). After that, KV is the source of truth — keep `expenses.js`
as a rough offline fallback, but the live totals come from KV.

Model: `claude-haiku-4-5`, structured output via forced tool-use
(`record_expense`), names validated against `CREW`. See the claude-api skill.
- Deploy: `vercel deploy --prod` from this folder (already linked to cdmxbach).

---

## Photo intake workflow (El Álbum)

**When José sends one or more images, treat each as a new photo for El Álbum**
(`photos.html`) unless he says otherwise. The goal: he texts "here are 5 from
last night," and the photos appear in the gallery with him answering as little
as possible.

### Steps

1. **Get the file onto disk.** Images pasted into Claude Code are embedded in
   the session transcript as base64, not saved as files. To recover one:
   - Find the newest transcript: `ls -t ~/.claude/projects/-Users-sirpodrick-Desktop-Projects-CDMX/*.jsonl | head -1`
   - Decode the most recent embedded image(s) — walk the JSON for objects with
     `type:"image"` and `source.type:"base64"`, `base64 -D` the `data` into a
     temp file. (See git history of this ticket for a working Python snippet.)
   - **Verify** you grabbed the right image by viewing it (Read tool) before
     saving — there may be several embedded images (old screenshots, etc.); the
     one you want is usually the largest/most recent JPEG.

2. **Read EXIF metadata first** — don't ask for what the photo already tells
   you. Tools, in order of preference:
   - `exiftool <file>` if installed (best; gives DateTimeOriginal + GPS).
   - Fallback: `mdls -name kMDItemContentCreationDate -name kMDItemLatitude -name kMDItemLongitude <file>` and `sips -g all <file>`.
   - **Reality check:** images pasted into chat almost always have EXIF
     stripped (no GPS, unreliable date). When that's the case, ask José for
     date/time/location. If he wants GPS/EXIF preserved, he should share the
     original files via a synced folder (iCloud/Dropbox) instead of pasting.

3. **Derive the day from the capture date** automatically:
   May 28 → `thu`, 29 → `fri`, 30 → `sat`, 31 → `sun`. If the date is outside
   May 28–31, flag it and confirm with José.

4. **Reverse-geocode GPS** (if present) to a venue/neighbourhood for the
   `location` field via Nominatim (same approach as venue geocoding). If no GPS,
   ask for location (optional — don't block on it).

5. **Ask José only for the missing required fields** — almost always just the
   **caption** and the **category**. Batch the questions; never one at a time.
   Example: *"Got 3 photos, looks like Friday night. For each, what's the
   caption and is it comida / bebida / actividad / crew?"*

6. **Categories:** `com` (comida), `beb` (bebida), `act` (actividad),
   `crew` (el equipo). A photo may have **more than one** — pass an array
   (e.g. a group shot at dinner = `["crew","com"]`); it then shows under both
   category filters.

7. **Auto-assign — never ask:**
   - `rot`: a small random tilt, roughly −2.5° to +2.5°.
   - `taped`: `true` for about 1 in 4 photos.

8. **Optimize + save the image** into `assets/Photos/` with a sensible
   kebab-case filename (e.g. `lucha-masks.jpg`). Downscale to ~1600px longest
   side and re-encode JPEG ~quality 72 so the page stays fast on mobile:
   `sips -Z 1600 -s format jpeg -s formatOptions 72 <src> --out assets/Photos/<name>.jpg`

9. **Add the metadata entry** to `js/photos.js` (`window.PHOTOS`) with:
   `img` (path), `cap`, `cat` (string or array), `date` (e.g. "MAY 29"),
   `time` (e.g. "21:40", or "" if unknown), `day`, optional `location`,
   plus auto `rot` and `taped`.

10. **Deploy and confirm.** `vercel deploy --prod`, then tell José what was
    added and that it's live (the gallery updates within minutes).

### photos.js entry shape

```js
{
  img: "assets/Photos/lucha-masks.jpg",
  cap: "Arena México · máscaras everywhere",
  cat: ["act"],            // or e.g. ["crew","com"]
  date: "MAY 29", time: "20:45", day: "fri",
  location: "Arena México, Doctores",
  rot: 1.6, taped: true,
}
```

### Don't
- Don't ask about rotation or tape — auto-assign them.
- Don't invent a caption or category — those come from José.
- Don't commit full-resolution phone photos (multi-MB) — always downscale first.

---

## Expense intake workflow (La Cuenta)

When José sends a bill/receipt to split, add it to `js/expenses.js` and deploy.

1. **Read the receipt.** If it's a photo, recover it from the transcript (same
   technique as photos) and read the total. Capture the **total in MXN**, the
   venue/description, and the date.
2. **Ask only what's missing** — usually **who paid** and **who's splitting**
   (which crew names). If José already said (e.g. "Contramar, paid by Max,
   split 7 ways"), don't re-ask.
3. **Names must match `window.CREW`** exactly: Izak, Max, Brian, Mike, Vishnu,
   Edwin, Jose, Soumya. "Split N ways" with names listed → put those names in
   `split`. An even split is assumed; if someone covers a different share, ask.
4. **Append an entry** to `window.EXPENSES`:
   ```js
   { id: "venue-day", date: "MAY 28", day: "thu", desc: "Contramar · dinner",
     amountMXN: 9702.50, paidBy: "Max",
     split: ["Izak","Max","Brian","Mike","Vishnu","Edwin","Jose"], note: "..." }
   ```
   `paidBy` is included in `split` if they ate too (almost always).
5. **Don't compute balances by hand** — `js/cuenta.js` nets everyone out and
   produces the minimal "who owes whom" transfers. Just add the data.
6. **Deploy** and confirm the new total + settlement to José.

The site shows MXN with a live USD estimate (open.er-api.com). Money is for a
casual group tab — cent-level rounding (~$0.01 total) is fine.
