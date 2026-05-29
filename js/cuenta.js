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

  // ── Add-an-expense (structured form → commit) ──
  function setupAddForm() {
    const form = document.getElementById("addForm");
    if (!form) return;
    const who = document.getElementById("addWho");
    const paid = document.getElementById("addPaid");
    const desc = document.getElementById("addDesc");
    const amt = document.getElementById("addAmt");
    const usd = document.getElementById("addUsd");
    const pin = document.getElementById("addPin");
    const chipsEl = document.getElementById("addChips");
    const status = document.getElementById("addStatus");
    const crew = DATA.crew || [];

    crew.forEach(n => {
      who.appendChild(new Option(n, n));
      paid.appendChild(new Option(n, n));
    });

    const chips = {};
    crew.forEach(n => {
      const c = document.createElement("div");
      c.className = "add-chip on"; c.textContent = n; c.dataset.name = n;
      c.addEventListener("click", () => c.classList.toggle("on"));
      chipsEl.appendChild(c); chips[n] = c;
    });
    const selected = () => crew.filter(n => chips[n].classList.contains("on"));

    document.getElementById("addAll").addEventListener("click", () => crew.forEach(n => chips[n].classList.add("on")));
    document.getElementById("addNone").addEventListener("click", () => crew.forEach(n => chips[n].classList.remove("on")));

    // Picking "your name" defaults the payer to you and ensures you're in the split.
    who.addEventListener("change", () => {
      if (who.value) { paid.value = who.value; chips[who.value] && chips[who.value].classList.add("on"); }
    });
    // The payer always shares — keep their chip on.
    paid.addEventListener("change", () => { if (paid.value && chips[paid.value]) chips[paid.value].classList.add("on"); });

    amt.addEventListener("input", () => {
      const v = parseFloat(amt.value);
      usd.textContent = isFinite(v) && v > 0 ? "≈ $" + (v / RATE).toLocaleString("en-US", { maximumFractionDigits: 0 }) + " USD" : "";
    });

    const say = (msg, kind) => { status.textContent = msg || ""; status.className = "add-status" + (kind ? " " + kind : ""); };

    document.getElementById("addSave").addEventListener("click", () => {
      const expense = {
        desc: desc.value.trim(),
        amountMXN: parseFloat(amt.value),
        paidBy: paid.value || who.value,
        split: selected(),
      };
      if (!expense.desc) return say("Give it a name.", "err");
      if (!(expense.amountMXN > 0)) return say("Enter an amount.", "err");
      if (!expense.paidBy) return say("Pick who paid.", "err");
      if (expense.split.length === 0) return say("Pick who's splitting it.", "err");
      if (!pin.value) return say("Enter the crew PIN.", "err");

      say("Saving…");
      fetch("/api/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "commit", pin: pin.value, expense }),
      }).then(r => r.json().then(d => ({ ok: r.ok, d }))).then(({ ok, d }) => {
        if (!ok) return say(d.error || "Couldn't save.", "err");
        DATA.expenses = d.expenses; render();
        desc.value = ""; amt.value = ""; usd.textContent = "";
        crew.forEach(n => chips[n].classList.add("on"));
        say("Added ✓ — totals updated", "ok");
      }).catch(() => say("Network error — try again.", "err"));
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
