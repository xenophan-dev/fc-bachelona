// Shared nav dropdown toggle. Tap "MÁS" to open/close; tap outside or Escape closes.
(function () {
  document.addEventListener("click", function (e) {
    const more = document.querySelector("nav .more");
    if (!more) return;
    const toggle = e.target.closest(".more-toggle");
    if (toggle) {
      e.preventDefault();
      const open = more.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    if (!e.target.closest(".more-menu")) more.classList.remove("open");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const m = document.querySelector("nav .more.open");
      if (m) m.classList.remove("open");
    }
  });
})();
