/* Networking 2026 — Análisis DAFO: hasta 3 opciones por bloque, envío sin recargar y confirmación. */
(function () {
  "use strict";

  var MAX = 3;
  var form = document.getElementById("formDafo");
  var ok = document.getElementById("dafoOk");
  var aviso = document.getElementById("dafoError");
  var enviar = document.getElementById("dafoEnviar");
  var bloques = Array.prototype.slice.call(form.querySelectorAll("[data-bloque]"));

  // Contador «2/3» y, al llegar al máximo, el resto de opciones del bloque se desactivan
  function actualizar(bloque) {
    var casillas = bloque.querySelectorAll("input[type=checkbox]");
    var marcadas = bloque.querySelectorAll("input[type=checkbox]:checked").length;
    bloque.querySelector(".df-cuenta").textContent = marcadas + "/" + MAX;
    bloque.classList.toggle("completo", marcadas >= MAX);
    Array.prototype.forEach.call(casillas, function (c) { c.disabled = !c.checked && marcadas >= MAX; });
  }
  bloques.forEach(function (b) {
    b.addEventListener("change", function () { actualizar(b); aviso.hidden = true; b.classList.remove("falta"); });
    actualizar(b);
  });

  function abrirOk() {
    if (typeof ok.showModal === "function") ok.showModal();
    else ok.setAttribute("open", "");
  }
  ok.addEventListener("click", function (e) {
    if (e.target === ok || e.target.hasAttribute("data-cerrar")) { ok.close(); window.scrollTo(0, 0); }
  });
  if (ok.hasAttribute("data-abrir")) abrirOk(); // sin JavaScript, el servidor vuelve con ?enviado=1

  function error(msg, bloque) {
    aviso.textContent = msg;
    aviso.hidden = false;
    if (bloque) { bloque.classList.add("falta"); bloque.scrollIntoView({ behavior: "smooth", block: "center" }); }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    aviso.hidden = true;
    var mesa = form.querySelector("[name=mesa]:checked, input[type=hidden][name=mesa]");
    if (!mesa) { error("Elige en qué mesa estáis.", form.querySelector(".df-mesas").closest("fieldset")); return; }
    for (var i = 0; i < bloques.length; i++) {
      if (!bloques[i].querySelector("input:checked")) {
        error("Marca al menos una opción en " + bloques[i].dataset.titulo + ".", bloques[i]);
        return;
      }
    }

    enviar.disabled = true;
    enviar.innerHTML = '<span class="cargando" aria-hidden="true"><i></i><i></i><i></i></span>Enviando…';
    form.classList.add("enviando");
    fetch(form.action, { method: "POST", body: new FormData(form), headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (res) {
        if (res && res.ok) {
          // Se vacían las opciones pero se mantiene la mesa, para el siguiente equipo
          Array.prototype.forEach.call(form.querySelectorAll("input[type=checkbox]"), function (c) { c.checked = false; });
          bloques.forEach(actualizar);
          abrirOk();
          return;
        }
        error((res && res.error) || "No hemos podido guardar las respuestas. Inténtalo de nuevo en unos segundos.");
      })
      .catch(function () { error("No hay conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo."); })
      .then(function () {
        enviar.disabled = false;
        enviar.textContent = "Enviar el DAFO de la mesa";
        form.classList.remove("enviando");
      });
  });
})();
