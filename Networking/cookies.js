/* Networking 2026 — aviso de cookies discreto.
   La web no usa cookies de seguimiento. El aviso solo recuerda que se ha visto:
   guarda ese dato en el almacenamiento local del navegador (no es una cookie) para no repetirlo. */
(function () {
  "use strict";

  var CLAVE = "networking2026-aviso";

  function visto() {
    try { return localStorage.getItem(CLAVE) === "ok"; } catch (e) { return false; }
  }
  if (visto()) return;

  var aviso = document.createElement("aside");
  aviso.className = "aviso-cookies";
  aviso.setAttribute("role", "region");
  aviso.setAttribute("aria-label", "Aviso de cookies");

  var texto = document.createElement("p");
  texto.textContent = "Esta web no usa cookies de seguimiento ni de publicidad. ";
  var enlace = document.createElement("a");
  enlace.href = "privacidad.html";
  enlace.textContent = "Más información";
  texto.appendChild(enlace);

  var boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = "Entendido";
  boton.addEventListener("click", function () {
    try { localStorage.setItem(CLAVE, "ok"); } catch (e) { /* sin almacenamiento, el aviso simplemente vuelve a aparecer */ }
    aviso.remove();
  });

  aviso.appendChild(texto);
  aviso.appendChild(boton);
  document.body.appendChild(aviso);
})();
