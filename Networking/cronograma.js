/* Networking 2026 — cronograma: al bajar por las fichas, el tangram del panel se monta pieza a pieza. */
(function () {
  "use strict";

  var sec = document.getElementById("cronograma");
  if (!sec) return;
  var lista = sec.querySelector(".cr-fichas");
  var fichas = [].slice.call(sec.querySelectorAll(".ficha"));
  var piezas = [].slice.call(sec.querySelectorAll(".cr-piezas polygon"));
  var tangram = sec.querySelector(".cr-tangram");
  var hora = document.getElementById("crHora"), que = document.getElementById("crQue");
  var barra = document.getElementById("crBarra"), paso = document.getElementById("crPaso");
  var TOTAL = 155; // minutos de 11:15 a 13:50
  var actual = null;

  function activar(i) {
    if (i === actual) return;
    actual = i;
    fichas.forEach(function (f, k) { f.classList.toggle("activa", k === i); });
    piezas.forEach(function (p) { p.classList.toggle("on", +p.getAttribute("data-p") <= i); });
    var f = fichas[Math.max(i, 0)];
    var ultima = i === fichas.length - 1;
    hora.textContent = f.getAttribute("data-hora");
    que.textContent = i < 0 ? "Empieza la mañana" : f.getAttribute("data-que");
    hora.classList.remove("cambia");
    void hora.offsetWidth; // reinicia la animación
    hora.classList.add("cambia");
    barra.style.width = (i < 0 ? 0 : ultima ? 100 : (+f.getAttribute("data-min") / TOTAL) * 100) + "%";
    paso.textContent = Math.max(i + 1, 0) + " / " + fichas.length;
    tangram.classList.toggle("completo", ultima);
  }

  // La ficha activa es la última cuyo borde superior ha pasado el centro de la pantalla
  var pendiente = false;
  function medir() {
    pendiente = false;
    var linea = window.innerHeight * 0.55, i = -1;
    for (var k = 0; k < fichas.length; k++) if (fichas[k].getBoundingClientRect().top < linea) i = k;
    activar(i);
  }
  window.addEventListener("scroll", function () { if (!pendiente) { pendiente = true; requestAnimationFrame(medir); } }, { passive: true });
  window.addEventListener("resize", medir);
  medir();

  // Entrada de cada ficha, como una pieza que se coloca
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("vista"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    fichas.forEach(function (f) { io.observe(f); });
  } else {
    fichas.forEach(function (f) { f.classList.add("vista"); });
  }
  lista.classList.add("listo");
})();
