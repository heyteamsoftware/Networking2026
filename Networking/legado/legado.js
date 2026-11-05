/* Networking 2026 — El legado: envía el formulario sin recargar la página y muestra la confirmación. */
(function () {
  "use strict";

  var form = document.getElementById("formLegado");
  var ok = document.getElementById("legadoOk");
  var aviso = document.getElementById("legadoError");
  var enviar = document.getElementById("legadoEnviar");
  var persona = document.getElementById("l-persona");
  var contactoEmpresa = document.getElementById("l-contacto-empresa");

  // La persona de contacto suele ser también el contacto por la empresa
  persona.addEventListener("change", function () {
    if (!contactoEmpresa.value.trim() || contactoEmpresa.dataset.auto === "1") {
      contactoEmpresa.value = persona.value.trim();
      contactoEmpresa.dataset.auto = "1";
    }
  });
  contactoEmpresa.addEventListener("input", function () { contactoEmpresa.dataset.auto = ""; });

  function mostrarOk() {
    form.reset();
    contactoEmpresa.dataset.auto = "";
    aviso.hidden = true;
    if (typeof ok.showModal === "function") ok.showModal();
    else ok.setAttribute("open", "");
  }
  ok.addEventListener("click", function (e) {
    if (e.target === ok || e.target.hasAttribute("data-cerrar")) {
      ok.close();
      window.scrollTo(0, form.getBoundingClientRect().top + window.pageYOffset - 80);
    }
  });
  // Sin JavaScript el formulario vuelve con ?enviado=1
  if (/[?&]enviado=1/.test(location.search)) mostrarOk();

  function error(msg, campo) {
    aviso.textContent = msg;
    aviso.hidden = false;
    if (campo) { campo.setAttribute("aria-invalid", "true"); campo.focus(); }
  }
  form.addEventListener("input", function (e) { e.target.removeAttribute("aria-invalid"); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    aviso.hidden = true;
    var req = [["l-empresa", "Escribe el nombre de la empresa u organización."],
               ["l-persona", "Escribe el nombre de la persona de contacto."],
               ["l-email", "Escribe un correo electrónico válido para poder hacer el seguimiento."],
               ["l-necesidad", "Cuéntanos la necesidad o el interés que compartís."],
               ["l-accion", "Escribe una acción que podáis empezar en los próximos 30 días."],
               ["l-contacto-empresa", "Indica la persona de contacto por la empresa."],
               ["l-contacto-otra", "Indica la persona de contacto por la otra parte."]];
    for (var i = 0; i < req.length; i++) {
      var c = document.getElementById(req[i][0]);
      if (!c.value.trim() || !c.checkValidity()) { error(req[i][1], c); return; }
    }
    var acepto = document.getElementById("l-acepto");
    if (!acepto.checked) { error("Para registrar el legado necesitamos que aceptes el uso de estos datos para el seguimiento.", acepto); return; }

    enviar.disabled = true;
    enviar.innerHTML = '<span class="cargando" aria-hidden="true"><i></i><i></i><i></i></span>Enviando…';
    form.classList.add("enviando");
    fetch(form.action, { method: "POST", body: new FormData(form), headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (res) {
        if (res && res.ok) { mostrarOk(); return; }
        error((res && res.error) || "No hemos podido guardar el legado. Inténtalo de nuevo en unos minutos.");
      })
      .catch(function () { error("No hay conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo."); })
      .then(function () {
        enviar.disabled = false;
        enviar.textContent = "Registrar el legado";
        form.classList.remove("enviando");
      });
  });
})();
