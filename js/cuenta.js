// js/cuenta.js — La Cuenta logic: net balances + minimal settlement.
// Pure helpers on window.CUENTA for testing; render() wires the DOM.

(function () {
  // Net per person = (what they paid) − (sum of their equal shares).
  function compute(expenses, crew) {
    const net = {};
    (crew || []).forEach(n => { net[n] = 0; });
    for (const e of expenses) {
      const share = e.amountMXN / e.split.length;
      for (const n of e.split) net[n] = (net[n] || 0) - share;
      net[e.paidBy] = (net[e.paidBy] || 0) + e.amountMXN;
    }
    // round to cents
    Object.keys(net).forEach(n => { net[n] = Math.round(net[n] * 100) / 100; });
    return net;
  }

  // Greedy minimal settlement: biggest debtor pays biggest creditor.
  function settle(net) {
    const cred = [], deb = [];
    Object.keys(net).forEach(n => {
      const v = net[n];
      if (v > 0.005) cred.push({ n, v });
      else if (v < -0.005) deb.push({ n, v: -v });
    });
    cred.sort((a, b) => b.v - a.v);
    deb.sort((a, b) => b.v - a.v);
    const tx = [];
    let i = 0, j = 0;
    while (i < deb.length && j < cred.length) {
      const amt = Math.min(deb[i].v, cred[j].v);
      tx.push({ from: deb[i].n, to: cred[j].n, amount: Math.round(amt * 100) / 100 });
      deb[i].v -= amt; cred[j].v -= amt;
      if (deb[i].v < 0.005) i++;
      if (cred[j].v < 0.005) j++;
    }
    return tx;
  }

  window.CUENTA = { compute, settle };

  // ───────────────────────── DOM ─────────────────────────
  if (typeof document === "undefined") return;

  let RATE = 17.34, RATE_LIVE = false; // MXN per USD
  // Live data when the API is configured; falls back to the committed snapshot.
  let DATA = { expenses: (window.EXPENSES || []).slice(), crew: (window.CREW || []) };
  const peso = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const usd = n => "~$" + (n / RATE).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " USD";

  function render() {
    const expenses = DATA.expenses;
    const crew = DATA.crew;
    const net = compute(expenses, crew);
    const tx = settle(net);
    const total = expenses.reduce((s, e) => s + e.amountMXN, 0);

    // Header totals
    const sumEl = document.getElementById("cuentaSummary");
    if (sumEl) {
      sumEl.innerHTML =
        '<div class="cu-total">' + peso(total) + ' <span class="cu-mxn">MXN</span></div>' +
        '<div class="cu-sub">' + expenses.length + ' expense' + (expenses.length === 1 ? "" : "s") +
        ' · ' + usd(total) + ' · ' + (RATE_LIVE ? "live" : "est.") + ' rate ' + RATE.toFixed(2) + '</div>';
    }

    // Settle up — who owes whom
    const setEl = document.getElementById("settle");
    if (setEl) {
      if (tx.length === 0) {
        setEl.innerHTML = '<div class="cu-even">— all square —</div>';
      } else {
        setEl.innerHTML = tx.map(t =>
          '<div class="cu-tx">' +
            '<span class="cu-from">' + t.from + '</span>' +
            '<span class="cu-arrow">→</span>' +
            '<span class="cu-to">' + t.to + '</span>' +
            '<span class="cu-amt">' + peso(t.amount) + ' <span class="cu-u">' + usd(t.amount) + '</span></span>' +
          '</div>'
        ).join("");
      }
    }

    // Balances per person (only those involved)
    const balEl = document.getElementById("balances");
    if (balEl) {
      const rows = crew.filter(n => Math.abs(net[n] || 0) > 0.005)
        .sort((a, b) => (net[b] || 0) - (net[a] || 0));
      balEl.innerHTML = rows.map(n => {
        const v = net[n];
        const cls = v > 0 ? "pos" : "neg";
        const lbl = v > 0 ? "gets back" : "owes";
        return '<div class="cu-bal ' + cls + '"><span class="cu-name">' + n + '</span>' +
          '<span class="cu-blbl">' + lbl + '</span>' +
          '<span class="cu-bamt">' + peso(Math.abs(v)) + '</span></div>';
      }).join("");
    }

    // Expense log
    const logEl = document.getElementById("log");
    if (logEl) {
      logEl.innerHTML = expenses.slice().reverse().map(e => {
        const head = e.amountMXN / e.split.length;
        return '<div class="cu-log">' +
          '<div class="cu-log-top"><span class="cu-log-desc">' + e.desc + '</span>' +
            '<span class="cu-log-amt">' + peso(e.amountMXN) + '</span></div>' +
          '<div class="cu-log-meta">' + e.date + ' · paid by <strong>' + e.paidBy + '</strong> · split ' +
            e.split.length + ' ways · ' + peso(head) + '/head' +
            (e.note ? ' · ' + e.note : '') + '</div>' +
        '</div>';
      }).join("");
    }
  }

  // Pull live expenses from the API; if it's not set up (source !== "kv"),
  // we keep the committed snapshot already in DATA.
  function loadLive() {
    return fetch("/api/expenses").then(r => r.json()).then(d => {
      if (d && d.source === "kv" && Array.isArray(d.expenses)) {
        DATA.expenses = d.expenses;
        if (Array.isArray(d.crew)) DATA.crew = d.crew;
        render();
      }
    }).catch(() => {});
  }

  // ── Add-an-expense flow (parse → confirm → commit) ──
  function setupAddForm() {
    const form = document.getElementById("addForm");
    if (!form) return;
    const who = document.getElementById("addWho");
    const pin = document.getElementById("addPin");
    const text = document.getElementById("addText");
    const askBtn = document.getElementById("addAsk");
    const status = document.getElementById("addStatus");
    const review = document.getElementById("addReview");

    (DATA.crew || []).forEach(n => {
      const o = document.createElement("option");
      o.value = n; o.textContent = n; who.appendChild(o);
    });

    const say = (msg, kind) => { status.textContent = msg || ""; status.className = "add-status" + (kind ? " " + kind : ""); };
    let proposal = null;

    function showProposal(p) {
      proposal = p;
      const head = p.amountMXN / p.split.length;
      review.innerHTML =
        '<div class="add-prop">' +
          '<div class="add-prop-desc">' + p.desc + '</div>' +
          '<div class="add-prop-meta">' + peso(p.amountMXN) + ' · paid by <strong>' + p.paidBy + '</strong> · split ' +
            p.split.length + ' ways (' + p.split.join(", ") + ') · ' + peso(head) + '/head</div>' +
          '<div class="add-prop-actions">' +
            '<button type="button" id="addConfirm" class="add-btn">✓ Confirm &amp; add</button>' +
            '<button type="button" id="addCancel" class="add-btn ghost">✕ Cancel</button>' +
          '</div>' +
        '</div>';
      review.style.display = "block";
      document.getElementById("addCancel").onclick = () => { review.style.display = "none"; proposal = null; };
      document.getElementById("addConfirm").onclick = commit;
    }

    function commit() {
      say("Saving…");
      fetch("/api/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", pin: pin.value, expense: proposal }),
      }).then(r => r.json().then(d => ({ ok: r.ok, d }))).then(({ ok, d }) => {
        if (!ok) return say(d.error || "Couldn't save.", "err");
        DATA.expenses = d.expenses; render();
        review.style.display = "none"; text.value = ""; proposal = null;
        say("Added ✓", "ok");
      }).catch(() => say("Network error.", "err"));
    }

    askBtn.addEventListener("click", () => {
      if (!who.value) return say("Pick your name first.", "err");
      if (!pin.value) return say("Enter the crew PIN.", "err");
      if (!text.value.trim()) return say("Describe the expense.", "err");
      say("Asking Claude…");
      review.style.display = "none";
      fetch("/api/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse", pin: pin.value, submittedBy: who.value, text: text.value }),
      }).then(r => r.json().then(d => ({ ok: r.ok, d }))).then(({ ok, d }) => {
        if (!ok) return say(d.error || "Couldn't parse.", "err");
        say(""); showProposal(d.proposal);
      }).catch(() => say("Network error.", "err"));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();
    setupAddForm();
    loadLive();
    fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json()).then(d => {
      if (d && d.rates && d.rates.MXN) { RATE = d.rates.MXN; RATE_LIVE = true; render(); }
    }).catch(() => {});
  });
})();
