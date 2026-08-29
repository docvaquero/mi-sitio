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

/* ========================= Formulario — Pago dinámico ========================= */
(() => {
  // Manejar estados de retorno del pago
  const params = new URLSearchParams(window.location.search);
  const estado = params.get('estado');
  if (estado) {
    ['aprende', 'horario', 'incluye', 'inscripcion', 'pago'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    document.querySelectorAll('section.reveal, .profesionales-nota').forEach(el => {
      el.style.display = 'none';
    });
    const map = { ok: 'estado-ok', error: 'estado-error', pendiente: 'estado-pendiente', cancelado: 'estado-cancelado' };
    const sec = document.getElementById(map[estado]);
    if (sec) sec.style.display = '';
    return;
  }

  const form        = document.getElementById('form-inscripcion');
  const pagoSec     = document.getElementById('pago');
  const inscSec     = document.getElementById('inscripcion');
  const btnEnviar   = document.getElementById('btn-inscribirse');
  const msg         = document.getElementById('form-msg');
  const selPais     = document.getElementById('pais');
  const campoPaisOtro = document.getElementById('campo-pais-otro');
  const inputPaisOtro = document.getElementById('pais-otro');

  if (!form) return;

  if (selPais && campoPaisOtro) {
    selPais.addEventListener('change', () => {
      const esOtro = selPais.value === 'Otro';
      campoPaisOtro.style.display = esOtro ? 'flex' : 'none';
      if (inputPaisOtro) inputPaisOtro.required = esOtro;
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const nombre      = form.nombre.value.trim();
    const email       = form.email.value.trim().toLowerCase();
    const telefono    = form.telefono.value.trim();
    const paisSel     = selPais.value;
    const paisOtro    = inputPaisOtro ? inputPaisOtro.value.trim() : '';
    const pais        = paisSel === 'Otro' ? (paisOtro || 'Otro') : paisSel;
    const codigoPromo = (document.getElementById('codigo-promo')?.value.trim().toUpperCase()) || '';

    if (!nombre || !email || !pais || !telefono) {
      if (msg) { msg.textContent = 'Por favor completá todos los campos.'; msg.style.color = '#c0392b'; }
      return;
    }

    btnEnviar.disabled    = true;
    btnEnviar.textContent = 'Procesando…';
    if (msg) msg.textContent = '';

    try {
      const res  = await fetch('/.netlify/functions/create-clase', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nombre, email, pais, telefono, codigoPromo }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (msg) { msg.textContent = data.error || 'Hubo un problema. Intentá de nuevo.'; msg.style.color = '#c0392b'; }
        return;
      }

      const btnMp    = document.getElementById('btn-clase-mp');
      const btnPp    = document.getElementById('btn-clase-pp');
      const cargando = document.getElementById('pago-cargando');
      const opciones = document.getElementById('pago-opciones');
      const errPago  = document.getElementById('pago-error');

      if (data.mpUrl    && btnMp) btnMp.href = data.mpUrl;
      if (data.paypalUrl && btnPp) btnPp.href = data.paypalUrl;

      if (data.promoAplicada) {
        const el = document.getElementById('promo-aplicada');
        if (el) el.style.display = '';
      }
      const montoMp = document.getElementById('monto-mp');
      const montoPp = document.getElementById('monto-pp');
      if (montoMp && data.precioARS) montoMp.textContent = `ARS ${data.precioARS.toLocaleString('es-AR')}`;
      if (montoPp && data.precioUSD) montoPp.textContent = `USD ${data.precioUSD}`;

      if (cargando) cargando.style.display = 'none';
      if (data.mpUrl || data.paypalUrl) { if (opciones) opciones.style.display = ''; }
      else { if (errPago) errPago.style.display = ''; }

      if (typeof fbq === 'function') fbq('track', 'Lead');

      if (inscSec) inscSec.style.display = 'none';
      if (pagoSec) {
        pagoSec.style.display = '';
        pagoSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      if (msg) { msg.textContent = 'Error de conexión. Intentá de nuevo.'; msg.style.color = '#c0392b'; }
      console.error(err);
    } finally {
      btnEnviar.disabled    = false;
      btnEnviar.textContent = 'Continuar al pago →';
    }
  });
})();

/* ============ Lazy-load videos ============ */
(function(){
  document.querySelectorAll('.js-vt-lazy').forEach(function(wrap){
    var btn = wrap.querySelector('.vt-lazy-btn');
    if (!btn) return;
    btn.addEventListener('click', function(){
      var iframe = document.createElement('iframe');
      iframe.src = wrap.dataset.src;
      iframe.allow = 'autoplay';
      iframe.allowFullscreen = true;
      iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0';
      iframe.title = 'Reproductor de video';
      btn.remove();
      wrap.appendChild(iframe);
    });
  });
})();
