(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const okEl  = document.getElementById('formOk');
  const errEl = document.getElementById('formErr');

  const show = el => el && el.removeAttribute('hidden');
  const hide = el => el && el.setAttribute('hidden', '');

  form.addEventListener('submit', (e) => {
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

    const nombre   = form.querySelector('#nombre').value.trim();
    const email    = form.querySelector('#email').value.trim();
    const telefono = form.querySelector('#telefono').value.trim() || '—';
    const pais     = form.querySelector('#pais').value.trim()     || '—';
    const mensaje  = form.querySelector('#mensaje').value.trim();

    const subject = encodeURIComponent('Nuevo mensaje — Contacto Web Doc Vaquero');
    const body    = encodeURIComponent(
      `Nombre: ${nombre}\nEmail: ${email}\nTeléfono: ${telefono}\nPaís: ${pais}\n\nMensaje:\n${mensaje}`
    );

    window.location.href = `mailto:doc.federicovaquero@gmail.com?subject=${subject}&body=${body}`;

    form.reset();
    show(okEl);
  }, false);
})();
