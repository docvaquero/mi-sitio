// Envío robusto a Formspree: fetch + fallback nativo si algo falla
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const btn   = document.getElementById('sendBtn');
  const okEl  = document.getElementById('formOk');
  const errEl = document.getElementById('formErr');
  const endpoint = form.getAttribute('action');

  const show = el => el && el.removeAttribute('hidden');
  const hide = el => el && el.setAttribute('hidden', '');

  form.addEventListener('submit', async (e) => {
    if (!window.fetch || !window.FormData) return;

    e.preventDefault();

    const hp = form.querySelector('input[name="_gotcha"]');
    if (hp && hp.value.trim() !== '') return;

    const consent = form.querySelector('#consent');
    if (consent && !consent.checked) {
      show(errEl);
      errEl.textContent = 'Por favor, aceptá el consentimiento para continuar.';
      return;
    }

    hide(okEl); hide(errEl);
    if (btn) btn.disabled = true;

    try {
      const data = new FormData(form);
      const res = await fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        redirect: 'follow'
      });

      let payload = null;
      try { payload = await res.json(); } catch (_) {}

      if (res.ok) {
        form.reset();
        show(okEl);
        return;
      }

      console.warn('Formspree error:', res.status, payload);
      show(errEl);
      errEl.textContent = 'No se pudo enviar. Reintentando…';
      setTimeout(() => form.submit(), 0);
    } catch (err) {
      console.error('Fallo de red:', err);
      show(errEl);
      errEl.textContent = 'Problema de conexión. Reintentando…';
      setTimeout(() => form.submit(), 0);
    } finally {
      if (btn) btn.disabled = false;
    }
  }, false);
})();
