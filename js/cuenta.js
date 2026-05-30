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

  // Pairwise net debts: for each pair, who owes whom across all expenses,
  // netted bilaterally. Shows the real "you owe X / Y owes you" picture
  // (unlike settle(), which minimizes total payments and can hide that).
  function pairwise(expenses) {
    const owe = {};
    const add = (a, b, amt) => { if (a === b) return; owe[a] = owe[a] || {}; owe[a][b] = (owe[a][b] || 0) + amt; };
    for (const e of expenses) {
      const share = e.amountMXN / e.split.length;
      for (const n of e.split) if (n !== e.paidBy) add(n, e.paidBy, share);
    }
    const all = new Set();
    for (const e of expenses) { all.add(e.paidBy); e.split.forEach(n => all.add(n)); }
    const arr = [...all], pairs = [];
    for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
      const a = arr[i], b = arr[j];
      const ab = (owe[a] && owe[a][b]) || 0, ba = (owe[b] && owe[b][a]) || 0;
      const net = Math.round((ab - ba) * 100) / 100;
      if (net > 0.005) pairs.push({ from: a, to: b, amount: net });
      else if (net < -0.005) pairs.push({ from: b, to: a, amount: -net });
    }
    return pairs.sort((x, y) => y.amount - x.amount);
  }

  window.CUENTA = { compute, settle, pairwise };

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
    const total = expenses.reduce((s, e) => s + e.amountMXN, 0);

    // Header totals
    const sumEl = document.getElementById("cuentaSummary");
    if (sumEl) {
      sumEl.innerHTML =
        '<div class="cu-total">' + peso(total) + ' <span class="cu-mxn">MXN</span></div>' +
        '<div class="cu-sub">' + expenses.length + ' expense' + (expenses.length === 1 ? "" : "s") +
        ' · ' + usd(total) + ' · ' + (RATE_LIVE ? "live" : "est.") + ' rate ' + RATE.toFixed(2) + '</div>';
    }

    // Settle up — rendered separately so the mode toggle can re-render it alone.
    renderSettle();

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
        return '<div class="cu-log" data-id="' + e.id + '">' +
          '<div class="cu-log-top">' +
            '<span class="cu-log-desc">' + e.desc + '</span>' +
            '<span class="cu-log-amt">' + peso(e.amountMXN) + '</span>' +
            '<button type="button" class="cu-log-del" title="Delete">✕</button>' +
          '</div>' +
          '<div class="cu-log-meta">' + e.date + ' · paid by <strong>' + e.paidBy + '</strong> · split ' +
            e.split.length + ' ways · ' + peso(head) + '/head' +
            (e.note ? ' · ' + e.note : '') + '</div>' +
          '<div class="cu-log-detail">' +
            '<div class="cu-log-sub">SPLIT BETWEEN</div>' +
            '<div class="cu-log-names">' + e.split.join(" · ") + '</div>' +
            '<div class="cu-log-each">each owes ' + peso(head) + ' ' + usd(head) + '</div>' +
            '<button type="button" class="cu-log-edit">✎ Rename</button>' +
          '</div>' +
        '</div>';
      }).join("");

      // Tap a row to expand/collapse. Buttons inside stop propagation.
      logEl.querySelectorAll(".cu-log").forEach(row => {
        row.addEventListener("click", () => row.classList.toggle("open"));
      });

      // Delete buttons.
      logEl.querySelectorAll(".cu-log-del").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const row = btn.closest(".cu-log");
          const id = row && row.dataset.id;
          const desc = row && row.querySelector(".cu-log-desc").textContent;
          if (!id) return;
          const pinEl = document.getElementById("addPin");
          let pin = pinEl && pinEl.value;
          if (!pin) pin = prompt('PIN to delete "' + desc + '":') || "";
          if (!pin) return;
          if (!confirm('Delete "' + desc + '"? This can\'t be undone.')) return;
          btn.disabled = true;
          fetch("/api/expenses", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", pin, id }),
          }).then(r => r.json().then(d => ({ ok: r.ok, d }))).then(({ ok, d }) => {
            if (!ok) { btn.disabled = false; return alert(d.error || "Couldn't delete."); }
            DATA.expenses = d.expenses; render();
          }).catch(() => { btn.disabled = false; alert("Network error."); });
        });
      });

      // Rename buttons (in expanded view).
      logEl.querySelectorAll(".cu-log-edit").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const row = btn.closest(".cu-log");
          const id = row && row.dataset.id;
          const current = row && row.querySelector(".cu-log-desc").textContent;
          if (!id) return;
          const next = (prompt("Rename:", current) || "").trim();
          if (!next || next === current) return;
          const pinEl = document.getElementById("addPin");
          let pin = pinEl && pinEl.value;
          if (!pin) pin = prompt("PIN:") || "";
          if (!pin) return;
          btn.disabled = true;
          fetch("/api/expenses", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "edit", pin, id, patch: { desc: next } }),
          }).then(r => r.json().then(d => ({ ok: r.ok, d }))).then(({ ok, d }) => {
            if (!ok) { btn.disabled = false; return alert(d.error || "Couldn't save."); }
            DATA.expenses = d.expenses; render();
          }).catch(() => { btn.disabled = false; alert("Network error."); });
        });
      });
    }
  }

  // Settle-up view state: pairwise by person, filterable to one name.
  let settlePerson = "all";

  const txRow = t =>
    '<div class="cu-tx">' +
      '<span class="cu-from">' + t.from + '</span>' +
      '<span class="cu-arrow">→</span>' +
      '<span class="cu-to">' + t.to + '</span>' +
      '<span class="cu-amt">' + peso(t.amount) + ' <span class="cu-u">' + usd(t.amount) + '</span></span>' +
    '</div>';
  const evenRow = '<div class="cu-even">— all square —</div>';

  function renderSettle() {
    const setEl = document.getElementById("settle");
    if (!setEl) return;
    const pairs = pairwise(DATA.expenses);
    if (settlePerson === "all") {
      setEl.innerHTML = pairs.length ? pairs.map(txRow).join("") : evenRow;
      return;
    }
    const owe = pairs.filter(p => p.from === settlePerson);
    const owed = pairs.filter(p => p.to === settlePerson);
    const none = '<div class="cu-even">— nothing —</div>';
    setEl.innerHTML =
      '<div class="settle-sub">' + settlePerson.toUpperCase() + ' OWES</div>' +
      (owe.length ? owe.map(txRow).join("") : none) +
      '<div class="settle-sub">OWES ' + settlePerson.toUpperCase() + '</div>' +
      (owed.length ? owed.map(txRow).join("") : none);
  }

  function setupSettleToggle() {
    const who = document.getElementById("settleWho");
    if (!who) return;
    (DATA.crew || []).forEach(n => who.appendChild(new Option(n, n)));
    who.addEventListener("change", () => { settlePerson = who.value; renderSettle(); });
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
    const paid = document.getElementById("addPaid");
    const desc = document.getElementById("addDesc");
    const amt = document.getElementById("addAmt");
    const usd = document.getElementById("addUsd");
    const pin = document.getElementById("addPin");
    const chipsEl = document.getElementById("addChips");
    const status = document.getElementById("addStatus");
    const crew = DATA.crew || [];

    crew.forEach(n => paid.appendChild(new Option(n, n)));

    const chips = {};
    crew.forEach(n => {
      const c = document.createElement("div");
      c.className = "add-chip"; c.textContent = n; c.dataset.name = n;
      c.addEventListener("click", () => c.classList.toggle("on"));
      chipsEl.appendChild(c); chips[n] = c;
    });
    const selected = () => crew.filter(n => chips[n].classList.contains("on"));

    document.getElementById("addAll").addEventListener("click", () => crew.forEach(n => chips[n].classList.add("on")));
    document.getElementById("addNone").addEventListener("click", () => crew.forEach(n => chips[n].classList.remove("on")));

    // Picking the payer auto-ticks their chip — they always share.
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
        paidBy: paid.value,
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
        // Reset chips to "none selected" + re-tick the payer's chip for the next entry.
        crew.forEach(n => chips[n].classList.remove("on"));
        if (paid.value && chips[paid.value]) chips[paid.value].classList.add("on");
        say("Added ✓ — totals updated", "ok");
      }).catch(() => say("Network error — try again.", "err"));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    render();
    setupSettleToggle();
    setupAddForm();
    loadLive();
    fetch("https://open.er-api.com/v6/latest/USD").then(r => r.json()).then(d => {
      if (d && d.rates && d.rates.MXN) { RATE = d.rates.MXN; RATE_LIVE = true; render(); }
    }).catch(() => {});
  });
})();
