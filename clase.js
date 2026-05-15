/* ========================= UTIL ========================= */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/* ========================= 1) Año ========================= */
const y = $('#y'); if (y) y.textContent = new Date().getFullYear();

/* ========================= 2) Menú móvil ========================= */
const btn = $('.menu');
const nav = $('.links');
if (btn && nav) {
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
}

/* ========================= 3) Smooth scroll ========================= */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const el = document.getElementById(id);
  if (el) {
    e.preventDefault();
    el.scrollIntoView({ behavior:'smooth', block:'start' });
    if (nav && btn) { nav.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
  }
});

/* ========================= 4) Reveal on scroll ========================= */
(() => {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach(el => el.classList.add('reveal--visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('reveal--visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => io.observe(el));
})();

/* ========================= 5) Parallax (HERO + #comprar) — desktop: puntero / móvil: scroll ========================= */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const targets = [
    document.querySelector('.hero'),
    document.getElementById('comprar')
  ].filter(Boolean);

  if (!targets.length) return;

  const hasHover = window.matchMedia('(hover: hover)').matches;

  function set(el, dx, dy){
    el.style.setProperty('--tx', (dx*0.04).toFixed(2)+'px');
    el.style.setProperty('--ty', (dy*0.06).toFixed(2)+'px');
  }
  function reset(el){
    el.style.setProperty('--tx','0px');
    el.style.setProperty('--ty','0px');
  }

  if (hasHover){
    // Desktop: movimiento con el puntero
    targets.forEach(el=>{
      el.addEventListener('pointermove', (e)=>{
        const r = el.getBoundingClientRect();
        set(el, e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2));
      });
      el.addEventListener('pointerleave', ()=> reset(el));
    });
  } else {
    // Móvil: efecto con el scroll
    let ticking = false;
    function update(){
      const vh = window.innerHeight || document.documentElement.clientHeight;
      targets.forEach(el=>{
        const r = el.getBoundingClientRect();
        const centerY = r.top + r.height/2;
        const dy = (vh/2) - centerY;   // cuanto más lejos del centro, más se mueve
        set(el, 0, dy);
      });
      ticking = false;
    }
    function onScroll(){
      if (!ticking){ ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll, {passive:true});
    update();
  }
})();

/* ========================= 6) EmailJS — Formulario de inscripción ========================= */
(() => {
  // ─── CONFIGURACIÓN EmailJS ───────────────────────────────────────────────
  // Reemplazá estos valores con los tuyos de emailjs.com
  const EJS_PUBLIC_KEY    = 'TU_PUBLIC_KEY';        // Account → General → Public Key
  const EJS_SERVICE_ID    = 'TU_SERVICE_ID';        // Email Services → Service ID
  const EJS_TPL_NOTIF     = 'TU_TEMPLATE_NOTIF';   // template que llega a vos
  const EJS_TPL_CONFIRM   = 'TU_TEMPLATE_CONFIRM'; // template que llega al comprador
  // ─────────────────────────────────────────────────────────────────────────

  const form     = document.getElementById('form-inscripcion');
  const pagoSec  = document.getElementById('pago');
  const inscSec  = document.getElementById('inscripcion');
  const btnEnviar = document.getElementById('btn-inscribirse');
  const msg      = document.getElementById('form-msg');

  if (!form) return;

  // Inicializar EmailJS solo si hay public key configurada
  if (EJS_PUBLIC_KEY !== 'TU_PUBLIC_KEY') {
    emailjs.init({ publicKey: EJS_PUBLIC_KEY });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const nombre = form.nombre.value.trim();
    const email  = form.email.value.trim();
    const pais   = form.pais.value;

    btnEnviar.disabled    = true;
    btnEnviar.textContent = 'Enviando…';
    msg.textContent       = '';
    msg.className         = 'form-msg';

    // Si EmailJS no está configurado todavía → saltar directo al pago
    if (EJS_PUBLIC_KEY === 'TU_PUBLIC_KEY') {
      mostrarPago();
      return;
    }

    try {
      // Email de notificación a Federico
      await emailjs.send(EJS_SERVICE_ID, EJS_TPL_NOTIF, { nombre, email, pais });

      // Email de confirmación al comprador
      await emailjs.send(EJS_SERVICE_ID, EJS_TPL_CONFIRM, { nombre, email, pais });

      // Evento Meta Pixel (lead)
      if (typeof fbq === 'function') fbq('track', 'Lead');

      mostrarPago();
    } catch (err) {
      console.error('EmailJS error:', err);
      msg.textContent = 'Hubo un error al enviar. Intentá de nuevo o escribinos por WhatsApp.';
      btnEnviar.disabled    = false;
      btnEnviar.textContent = 'Inscribirme →';
    }
  });

  function mostrarPago() {
    if (inscSec)  inscSec.style.display  = 'none';
    if (pagoSec) {
      pagoSec.style.display = 'block';
      pagoSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
})();
