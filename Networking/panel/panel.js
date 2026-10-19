// Networking 2026 — panel: aplica el filtro en cuanto cambia un desplegable.
document.querySelectorAll('.filtros select').forEach(s => s.addEventListener('change', () => s.form.submit()));
