/* ========================= Microdosis — JS ========================= */
(() => {
  'use strict';

  /* ---------- Utils ---------- */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const mm = (q) => window.matchMedia(q);
  const debounce = (fn, t=120) => {
    let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), t); };
  };

  /* Año en footer */
  const y = $('#y'); if (y) y.textContent = new Date().getFullYear();

  /* Menú móvil */
  (() => {
    const btn = $('.menu'), nav = $('.links');
    if (!(btn && nav)) return;
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
  })();

  /* Smooth scroll local (+ cierra menú si estaba abierto) */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href').slice(1), el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior:'smooth', block:'start' });
    const nav = $('.links'), btn = $('.menu');
    if (nav && nav.classList.contains('open')) { nav.classList.remove('open'); btn?.setAttribute('aria-expanded','false'); }
  });

  /* Reveal on scroll (ligero) */
  (() => {
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window) || !els.length){
      els.forEach(el => el.classList.add('reveal--visible')); return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting){ e.target.classList.add('reveal--visible'); io.unobserve(e.target); }
      });
    }, { threshold:0.12, rootMargin:'0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  })();

  /* Parallax desktop (puntero) + móvil (scroll) */
  (() => {
    if (mm('(prefers-reduced-motion: reduce)').matches) return;

    const secs = $$('[data-parallax]'); 
    if (!secs.length) return;

    const hover = window.matchMedia('(hover: hover)').matches;

    function set(el, dx, dy){
      el.style.setProperty('--tx', (dx*0.04).toFixed(2)+'px'); // X
      el.style.setProperty('--ty', (dy*0.06).toFixed(2)+'px'); // Y (móvil un poco más)
    }

    if (hover){
      // Desktop: sigue el puntero
      secs.forEach(sec => {
        sec.addEventListener('pointermove', (e) => {
          const r = sec.getBoundingClientRect();
          set(sec, e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2));
        });
        sec.addEventListener('pointerleave', () => {
          sec.style.setProperty('--tx','0px');
          sec.style.setProperty('--ty','0px');
        });
      });
    } else {
      // Móvil: efecto por scroll (estable en iOS/Android)
      let ticking = false;
      function update(){
        const vh = window.innerHeight || document.documentElement.clientHeight;
        secs.forEach(sec => {
          const r = sec.getBoundingClientRect();
          const centerY = r.top + r.height/2;
          const dy = (vh/2) - centerY;   // distancia al centro de la pantalla
          set(sec, 0, dy);               // solo Y en móvil
        });
        ticking = false;
      }
      function onScroll(){
        if (!ticking){ ticking = true; requestAnimationFrame(update); }
      }
      window.addEventListener('scroll', onScroll, {passive:true});
      window.addEventListener('resize', onScroll, {passive:true});
      update(); // primera posición al cargar
    }
  })();


  /* ---------- Alineación de recuadros (sin jank, sin redundancias) ---------- */
  // Regla: aplicamos offset SOLO en desktop (>=960px). En móvil se anula via CSS.
  const INTRO_TEXT   = '.intro .intro-text';
  const INTRO_BOX    = '.intro .intro-box';
  const VIDEO_TEXT   = '.video .video-text';
  const VIDEO_BOX    = '.video .video-box';
  const PARAQ_TEXT   = '.para-quien .pq-text';
  const PARAQ_BOX    = '.para-quien .pq-box';

  function alignToFirstParagraph(textSel, boxSel){
    const textCol = $(textSel), boxCol = $(boxSel);
    if (!(textCol && boxCol)) return;
    const firstP = textCol.querySelector('p'); if (!firstP) return;
    const colTop = textCol.getBoundingClientRect().top + window.scrollY;
    const pTop   = firstP.getBoundingClientRect().top + window.scrollY;
    const offset = Math.max(0, Math.round(pTop - colTop));
    boxCol.style.setProperty('--offset', offset + 'px');
  }

  function alignVideoBoxToVideoTop(){
    const textCol = $(VIDEO_TEXT), boxCol = $(VIDEO_BOX);
    if (!(textCol && boxCol)) return;
    const ratio = textCol.querySelector('.video .ratio'); if (!ratio) return;
    const colTop   = textCol.getBoundingClientRect().top + window.scrollY;
    const ratioTop = ratio.getBoundingClientRect().top + window.scrollY;
    const offset   = Math.max(0, Math.round(ratioTop - colTop));
    boxCol.style.setProperty('--offset', offset + 'px');
  }

  function resetOffsets(){
    [INTRO_BOX, VIDEO_BOX, PARAQ_BOX].forEach(sel => {
      const el = $(sel); if (el) el.style.setProperty('--offset','0px');
    });
  }

  function computeOffsets(){
    if (mm('(max-width: 959px)').matches){ resetOffsets(); return; }
    alignToFirstParagraph(INTRO_TEXT, INTRO_BOX);   // ¿De qué se trata? → primer párrafo
    alignVideoBoxToVideoTop();                      // Material exclusivo → tope del video
    alignToFirstParagraph(PARAQ_TEXT, PARAQ_BOX);   // Cita → primer párrafo
  }

  // Cálculo inicial rápido, al final de frame para evitar “salto”.
  const init = () => { computeOffsets(); };
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(init), { once:true });
  } else {
    requestAnimationFrame(init);
  }
  // Recalcular cuando cambie el layout (resize) o cuando carguen fuentes/iframes.
  window.addEventListener('load', computeOffsets, { once:true });
  window.addEventListener('resize', debounce(computeOffsets, 120), { passive:true });

  // Observamos cambios de tamaño del bloque de texto (por reflow de fuentes/zoom)
  if ('ResizeObserver' in window){
    const ro = new ResizeObserver(debounce(computeOffsets, 60));
    [$(INTRO_TEXT), $(VIDEO_TEXT), $(PARAQ_TEXT)].forEach(el => el && ro.observe(el));
  }
})();
