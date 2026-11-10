// Networking 2026 — panel: aplica el filtro en cuanto cambia un desplegable.
document.querySelectorAll('.filtros select').forEach(s => s.addEventListener('change', () => s.form.submit()));
document.querySelectorAll('[data-imprimir]').forEach(b => b.addEventListener('click', () => window.print()));
document.querySelectorAll('form[data-confirmar]').forEach(f => f.addEventListener('submit', e => { if (!confirm(f.dataset.confirmar)) e.preventDefault(); }));
// Análisis DAFO en pantalla: botón de pantalla completa (la página se recarga sola y el navegador la mantiene)
document.querySelectorAll('[data-pantalla]').forEach(b => b.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
}));

// Análisis DAFO en directo: cada pocos segundos se pide solo la parte que cambia (matriz y recuento)
document.querySelectorAll('[data-vivo]').forEach(caja => {
  const cada = (Number(caja.dataset.cada) || 10) * 1000;
  let parado = false;
  const pedir = async () => {
    if (parado || document.hidden) return;
    try {
      const r = await fetch(caja.dataset.vivo, { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok || r.headers.get('X-Dafo-Vivo') !== '1') {
        parado = true; // la sesión ha caducado: avisamos y dejamos de preguntar
        caja.insertAdjacentHTML('afterbegin', '<p class="aviso aviso-error">La sesión del panel ha caducado. Recarga la página y vuelve a entrar.</p>');
        return;
      }
      caja.innerHTML = await r.text();
    } catch (e) { /* sin conexión: se vuelve a intentar en la siguiente vuelta */ }
  };
  setInterval(pedir, cada);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pedir(); });
});
