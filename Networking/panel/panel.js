// Networking 2026 — panel: aplica el filtro en cuanto cambia un desplegable.
document.querySelectorAll('.filtros select').forEach(s => s.addEventListener('change', () => s.form.submit()));
document.querySelectorAll('[data-imprimir]').forEach(b => b.addEventListener('click', () => window.print()));
document.querySelectorAll('form[data-confirmar]').forEach(f => f.addEventListener('submit', e => { if (!confirm(f.dataset.confirmar)) e.preventDefault(); }));
