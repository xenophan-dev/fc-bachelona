// js/expenses.js — shared-expense log for La Cuenta (cuenta.html).
// The crew views balances here; José adds new expenses via Claude Code
// (no backend). See CLAUDE.md → "Expense intake workflow".
//
// Expense shape:
//   id        stable kebab-case id
//   date      display date, e.g. "MAY 28"
//   day       thu|fri|sat|sun (optional)
//   desc      what it was
//   amountMXN total in pesos (number)
//   paidBy    who fronted it (must be a CREW name)
//   split     array of CREW names sharing it equally
//   note      optional

window.CREW = ["Izak", "Max", "Brian", "Mike", "Vishnu", "Edwin", "Jose", "Soumya"];

window.EXPENSES = [
  {
    id: "contramar-thu",
    date: "MAY 28", day: "thu",
    desc: "Contramar · dinner",
    amountMXN: 9702.50,
    paidBy: "Max",
    split: ["Izak", "Max", "Brian", "Mike", "Vishnu", "Edwin", "Jose"],
    note: "Tostadas de atún, aguachile, pulpo, mezcalitas",
  },
];
