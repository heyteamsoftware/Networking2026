/* Networking 2026 — cronograma: entrada de los bloques y ficha de detalle al pulsar cada uno. */
(function () {
  "use strict";

  var tt = document.getElementById("tt");
  if (!tt) return;

  // Los bloques caen en su hueco cuando el horario entra en pantalla
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { tt.classList.add("vista"); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(tt);
  } else {
    tt.classList.add("vista");
  }

  // Ficha de detalle
  var ficha = document.getElementById("ttFicha");
  var cuerpo = ficha.querySelector(".tt-ficha-cuerpo");
  var origen = null;
  if (typeof ficha.showModal !== "function") return; // sin <dialog>, el horario se ve igual, sin fichas

  tt.addEventListener("click", function (ev) {
    var b = ev.target.closest(".tt-b");
    if (!b) return;
    var det = document.getElementById(b.getAttribute("data-det"));
    if (!det) return;
    cuerpo.innerHTML = det.innerHTML;
    cuerpo.style.setProperty("--c", det.getAttribute("data-c"));
    var h = cuerpo.querySelector("h3");
    if (h) h.id = "ttFichaTitulo";
    origen = b;
    ficha.showModal();
  });
  ficha.querySelector(".tt-cerrar").addEventListener("click", function () { ficha.close(); });
  // Clic fuera de la ficha: cerrar
  ficha.addEventListener("click", function (ev) { if (ev.target === ficha) ficha.close(); });
  ficha.addEventListener("close", function () { if (origen) origen.focus(); });
})();
