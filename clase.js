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

/* ========================= 5) Parallax sutil (HERO) ========================= */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hero = $('.hero');
  if (!hero) return;
  const move = (el, dx, dy) => {
    el.style.setProperty('--tx', (dx * 0.04).toFixed(2) + 'px');
    el.style.setProperty('--ty', (dy * 0.04).toFixed(2) + 'px');
  };
  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    move(hero, e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2));
  });
  hero.addEventListener('mouseleave', () => {
    hero.style.setProperty('--tx','0px');
    hero.style.setProperty('--ty','0px');
  });
})();
// Parallax local para #comprar (mueve --tx/--ty)
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('comprar');
  if (!el) return;
  el.addEventListener('mousemove', (e) => {
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top  + r.height/ 2);
    el.style.setProperty('--tx', (dx * 0.04).toFixed(2) + 'px');
    el.style.setProperty('--ty', (dy * 0.04).toFixed(2) + 'px');
  });
  el.addEventListener('mouseleave', () => {
    el.style.setProperty('--tx', '0px');
    el.style.setProperty('--ty', '0px');
  });
});
