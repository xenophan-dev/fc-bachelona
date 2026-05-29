// /api/expenses.mjs — La Cuenta backend (structured, no LLM).
//   GET                      → { expenses, crew, source }   (public; reads KV)
//   POST {action:"commit"}   → { expenses }                 (PIN; validates + writes KV)
//
// Degrades gracefully: with no KV env vars it returns source:"static" so the
// page falls back to the committed js/expenses.js snapshot — the site never
// breaks. Env vars (set in Vercel): CREW_PIN, plus the Vercel KV pair
// (KV_REST_API_URL / KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL / _TOKEN).

import { Redis } from "@upstash/redis";

const CREW = ["Izak", "Max", "Brian", "Mike", "Vishnu", "Edwin", "Jose", "Soumya"];
const KV_KEY = "cuenta:expenses:v1";
const RATE_MAX = 30; // writes per minute per IP

// Seed mirrors the committed js/expenses.js so KV starts with the known history.
const SEED = [
  { id: "contramar-thu", date: "MAY 28", day: "thu", desc: "Contramar · dinner",
    amountMXN: 11157.88, paidBy: "Max",
    split: ["Izak", "Max", "Brian", "Mike", "Vishnu", "Edwin", "Jose"],
    note: "$9,702.50 + 15% tip" },
  { id: "katz-kioto-thu", date: "MAY 28", day: "thu", desc: "Katz Kioto · bar",
    amountMXN: 1727.00, paidBy: "Izak",
    split: ["Izak", "Max", "Brian", "Mike", "Edwin", "Vishnu"],
    note: "Late-night drinks · Roma Norte" },
];

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

async function loadExpenses(redis) {
  const data = await redis.get(KV_KEY);
  if (!data) { await redis.set(KV_KEY, SEED); return SEED; }
  return Array.isArray(data) ? data : SEED;
}

// CDMX-local date stamp, e.g. "MAY 29", + trip day.
function cdmxStamp() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-US", { timeZone: "America/Mexico_City", month: "short", day: "numeric" })
    .format(now).toUpperCase();
  const iso = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(now);
  const day = { "2026-05-28": "thu", "2026-05-29": "fri", "2026-05-30": "sat", "2026-05-31": "sun" }[iso] || "";
  return { date, day };
}

// Reject anything that isn't a clean, crew-validated expense before it hits KV.
function sanitize(e) {
  if (!e || typeof e !== "object") return null;
  const desc = String(e.desc || "").slice(0, 80).trim();
  const amountMXN = Math.round(Number(e.amountMXN) * 100) / 100;
  const paidBy = CREW.find(n => n === e.paidBy);
  let split = Array.isArray(e.split) ? e.split.filter(n => CREW.includes(n)) : [];
  if (!desc || !isFinite(amountMXN) || amountMXN <= 0 || !paidBy || split.length === 0) return null;
  if (!split.includes(paidBy)) split.push(paidBy); // payer always shares
  split = [...new Set(split)];
  const stamp = cdmxStamp();
  const id = desc.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32)
    + "-" + Date.now().toString(36);
  return { id, date: stamp.date, day: stamp.day, desc, amountMXN, paidBy, split,
    note: String(e.note || "").slice(0, 120) };
}

async function rateOk(redis, ip) {
  if (!redis || !ip) return true;
  try {
    const key = "rl:" + ip;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, 60);
    return n <= RATE_MAX;
  } catch { return true; }
}

export default async function handler(req, res) {
  const redis = getRedis();

  if (req.method === "GET") {
    if (!redis) return res.status(200).json({ expenses: null, crew: CREW, source: "static" });
    try {
      const expenses = await loadExpenses(redis);
      return res.status(200).json({ expenses, crew: CREW, source: "kv" });
    } catch {
      return res.status(200).json({ expenses: null, crew: CREW, source: "static" });
    }
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (body.action !== "commit") return res.status(400).json({ error: "Unknown action." });
    if (!process.env.CREW_PIN) return res.status(503).json({ error: "Adding isn't set up yet." });
    if (String(body.pin || "") !== String(process.env.CREW_PIN)) return res.status(401).json({ error: "Wrong PIN." });
    if (!redis) return res.status(503).json({ error: "Store not configured." });

    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.headers["x-real-ip"];
    if (!(await rateOk(redis, ip))) return res.status(429).json({ error: "Too many — slow down a sec." });

    const exp = sanitize(body.expense);
    if (!exp) return res.status(400).json({ error: "Check the amount and that a payer + at least one person are selected." });
    try {
      const expenses = await loadExpenses(redis);
      expenses.push(exp);
      await redis.set(KV_KEY, expenses);
      return res.status(200).json({ expenses });
    } catch {
      return res.status(500).json({ error: "Couldn't save. Try again." });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
}
