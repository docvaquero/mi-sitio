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

/* ========================= 6) Auto-hide promo pasada la fecha ========================= */
(() => {
  // Fecha real de corte (hora Argentina, UTC-3)
  const PROMO_END = new Date('2026-06-03T23:59:59-03:00');
  if (new Date() > PROMO_END) {
    $$('.js-promo').forEach(el => { el.style.display = 'none'; });
  }
})();
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

/* ========================= 6) Google Apps Script — Formulario ========================= */
(() => {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxIyz26pLUHMoIV_HneimuUOW1vmFUgmdTfV58t6ptHc3wGXZRmZlJpB8Bx4BlPcrU5/exec';

  // Tu número de WhatsApp con código de país, sin + ni espacios
  // Ejemplo Argentina: 5491155554444  (54=AR, 9=móvil, los 8 dígitos del número)
  // Dejalo vacío hasta que lo tengas: el botón igualmente va a abrir tu WhatsApp
  const WA_NUMERO = '5491123099063';
  const WA_LINK_FALLBACK = 'https://wa.link/kcppfm';

  const form          = document.getElementById('form-inscripcion');
  const pagoSec       = document.getElementById('pago');
  const inscSec       = document.getElementById('inscripcion');
  const btnEnviar     = document.getElementById('btn-inscribirse');
  const msg           = document.getElementById('form-msg');
  const selPais       = document.getElementById('pais');
  const campoPaisOtro = document.getElementById('campo-pais-otro');
  const inputPaisOtro = document.getElementById('pais-otro');

  if (!form) return;

  // Mostrar / ocultar campo "Otro país"
  if (selPais && campoPaisOtro) {
    selPais.addEventListener('change', () => {
      const esOtro = selPais.value === 'Otro';
      campoPaisOtro.style.display = esOtro ? 'flex' : 'none';
      if (inputPaisOtro) inputPaisOtro.required = esOtro;
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const nombre = form.nombre.value.trim();
    const email  = form.email.value.trim();
    const pais   = (selPais.value === 'Otro' && inputPaisOtro)
                   ? inputPaisOtro.value.trim()
                   : selPais.value;

    btnEnviar.disabled    = true;
    btnEnviar.textContent = 'Enviando…';
    msg.textContent       = '';

    // Envío no-cors + URLSearchParams (evita preflight CORS de Google Apps Script)
    fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode:   'no-cors',
      body:   new URLSearchParams({ nombre, email, pais }),
    }).catch(() => {});  // fire & forget — el servidor igual recibe el POST

    // Evento Meta Pixel
    if (typeof fbq === 'function') fbq('track', 'Lead');

    // Construir link de WhatsApp con datos pre-cargados
    const btnWs = document.getElementById('btn-ws-comprobante');
    if (btnWs) {
      const texto = `Hola! Te mando el comprobante para la clase del 6 de junio.\nNombre: ${nombre}\nEmail: ${email}`;
      const url = WA_NUMERO
        ? `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(texto)}`
        : WA_LINK_FALLBACK;
      btnWs.setAttribute('href', url);
    }

    mostrarPago();
  });

  function mostrarPago() {
    if (inscSec)  inscSec.style.display  = 'none';
    if (pagoSec) {
      pagoSec.style.display = 'block';
      pagoSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
})();
