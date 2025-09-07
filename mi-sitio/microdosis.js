/* ===== Util ===== */
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

/* Año */
const y = $('#y'); if (y) y.textContent = new Date().getFullYear();

/* Menú móvil */
const btn = $('.menu'), nav = $('.links');
if (btn && nav) {
  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
}

/* Smooth scroll local */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]'); if(!a) return;
  const id = a.getAttribute('href').slice(1), el = document.getElementById(id);
  if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth',block:'start'}); nav?.classList.remove('open'); btn?.setAttribute('aria-expanded','false'); }
});

/* Reveal on scroll */
(() => {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window) || !els.length) {
    els.forEach(el=>el.classList.add('reveal--visible')); return;
  }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('reveal--visible'); io.unobserve(e.target); }
    });
  }, {threshold:0.12, rootMargin:'0px 0px -8% 0px'});
  els.forEach(el=>io.observe(el));
})();

/* ========= Parallax de fondo (solo secciones con data-parallax) ========= */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const secs = $$('[data-parallax]');
  if(!secs.length) return;

  const move = (el, dx, dy) => {
    el.style.setProperty('--tx', (dx*0.04).toFixed(2)+'px');
    el.style.setProperty('--ty', (dy*0.04).toFixed(2)+'px');
  };

  secs.forEach(sec=>{
    sec.addEventListener('mousemove', (e)=>{
      const r = sec.getBoundingClientRect();
      move(sec, e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2));
    });
    sec.addEventListener('mouseleave', ()=>{
      sec.style.setProperty('--tx','0px');
      sec.style.setProperty('--ty','0px');
    });
  });
})();
