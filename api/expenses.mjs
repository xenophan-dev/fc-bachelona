// /api/expenses.mjs — La Cuenta backend.
//   GET                      → { expenses, crew, source }   (public; reads KV)
//   POST {action:"parse"}    → { proposal }                 (PIN; Claude parses NL)
//   POST {action:"commit"}   → { expenses }                 (PIN; validates + writes KV)
//
// Degrades gracefully: with no KV/key env vars it returns source:"static" so the
// page falls back to the committed js/expenses.js snapshot — the site never breaks.
//
// Env vars (set in Vercel): ANTHROPIC_API_KEY, CREW_PIN, and the Vercel KV pair
// (KV_REST_API_URL / KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL / _TOKEN).

import Anthropic from "@anthropic-ai/sdk";
import { Redis } from "@upstash/redis";

const CREW = ["Izak", "Max", "Brian", "Mike", "Vishnu", "Edwin", "Jose", "Soumya"];
const KV_KEY = "cuenta:expenses:v1";

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

// Reject anything that isn't a clean, crew-validated expense before it hits KV.
function sanitize(e) {
  if (!e || typeof e !== "object") return null;
  const desc = String(e.desc || "").slice(0, 80).trim();
  const amountMXN = Math.round(Number(e.amountMXN) * 100) / 100;
  const paidBy = CREW.find(n => n === e.paidBy);
  const split = Array.isArray(e.split) ? e.split.filter(n => CREW.includes(n)) : [];
  if (!desc || !isFinite(amountMXN) || amountMXN <= 0 || !paidBy || split.length === 0) return null;
  if (!split.includes(paidBy)) split.push(paidBy); // payer always shares unless explicitly excluded upstream
  const id = desc.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32)
    + "-" + Date.now().toString(36);
  return { id, date: e.date || "", day: e.day || "", desc, amountMXN, paidBy,
    split: [...new Set(split)], note: String(e.note || "").slice(0, 120) };
}

const SYSTEM = (submittedBy) =>
  `You parse ONE shared expense from an 8-person CDMX bachelor-trip group into the record_expense tool.
Crew (exact names): Izak, Max, Brian, Mike, Vishnu, Edwin, Jose, Soumya.
The person entering this is ${submittedBy}. Resolve first-person words (me, I, myself, my, mine) to ${submittedBy}.
"the boys" / "everyone" / "the group" / "all of us" = all 8 crew unless the text narrows it.
paidBy and every name in split MUST be exact crew names from the list. The payer is included in split if they also consumed (almost always yes).
Amounts are Mexican pesos (MXN). If the text says USD or dollars, convert at 17.3 MXN per 1 USD. Round to 2 decimals.
desc is a short label (the venue or what it was), e.g. "Tacos Don Juan · lunch".`;

const TOOL = {
  name: "record_expense",
  description: "Record the parsed shared expense.",
  input_schema: {
    type: "object",
    properties: {
      desc: { type: "string", description: "Short label for the expense" },
      amountMXN: { type: "number", description: "Total in Mexican pesos" },
      paidBy: { type: "string", enum: CREW, description: "Who paid" },
      split: { type: "array", items: { type: "string", enum: CREW }, description: "Everyone splitting it" },
    },
    required: ["desc", "amountMXN", "paidBy", "split"],
  },
};

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
    if (!process.env.CREW_PIN) return res.status(503).json({ error: "Adding isn't set up yet." });
    if (String(body.pin || "") !== String(process.env.CREW_PIN)) return res.status(401).json({ error: "Wrong PIN." });

    if (body.action === "parse") {
      if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "Claude key not set." });
      const submittedBy = CREW.find(n => n === body.submittedBy) || "an unknown crew member";
      const text = String(body.text || "").slice(0, 600).trim();
      if (!text) return res.status(400).json({ error: "Say what the expense was." });
      try {
        const anthropic = new Anthropic();
        const msg = await anthropic.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 500,
          system: [{ type: "text", text: SYSTEM(submittedBy), cache_control: { type: "ephemeral" } }],
          tools: [TOOL],
          tool_choice: { type: "tool", name: "record_expense" },
          messages: [{ role: "user", content: text }],
        });
        const block = msg.content.find(b => b.type === "tool_use");
        const proposal = sanitize(block && block.input);
        if (!proposal) return res.status(422).json({ error: "Couldn't parse that — try naming who paid, the amount, and who's splitting." });
        return res.status(200).json({ proposal });
      } catch (e) {
        return res.status(502).json({ error: "Claude couldn't be reached. Try again." });
      }
    }

    if (body.action === "commit") {
      if (!redis) return res.status(503).json({ error: "Store not configured." });
      const exp = sanitize(body.expense);
      if (!exp) return res.status(400).json({ error: "Invalid expense." });
      try {
        const expenses = await loadExpenses(redis);
        expenses.push(exp);
        await redis.set(KV_KEY, expenses);
        return res.status(200).json({ expenses });
      } catch {
        return res.status(500).json({ error: "Couldn't save. Try again." });
      }
    }

    return res.status(400).json({ error: "Unknown action." });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed." });
}
