/* ===== Helpers ===== */
const $  = (s, r=document)=>r.querySelector(s);
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
  if(el){
    e.preventDefault();
    el.scrollIntoView({behavior:'smooth',block:'start'});
    if (nav && btn){ nav.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
  }
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
  els.forEach(el => io.observe(el));
})();

/* Parallax desktop (puntero) + móvil (scroll) */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const secs = $$('[data-parallax]');
  if (!secs.length) return;

  const hasHover = window.matchMedia('(hover: hover)').matches;

  function set(el, dx, dy){
    el.style.setProperty('--tx', (dx*0.04).toFixed(2)+'px'); // eje X
    el.style.setProperty('--ty', (dy*0.06).toFixed(2)+'px'); // eje Y
  }

  if (hasHover){
    // Desktop: movimiento con el mouse/puntero
    secs.forEach(sec=>{
      sec.addEventListener('pointermove', (e)=>{
        const r = sec.getBoundingClientRect();
        set(sec, e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2));
      });
      sec.addEventListener('pointerleave', ()=>{
        sec.style.setProperty('--tx','0px');
        sec.style.setProperty('--ty','0px');
      });
    });
  } else {
    // Móvil: efecto con el scroll
    let ticking = false;
    function update(){
      const vh = window.innerHeight || document.documentElement.clientHeight;
      secs.forEach(sec=>{
        const r = sec.getBoundingClientRect();
        const centerY = r.top + r.height/2;
        const dy = (vh/2) - centerY;
        set(sec, 0, dy);
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


/* Alinear recuadros al inicio del primer párrafo (sobre / cuerpo) */
function alignBox(sectionId, boxId){
  const sec = document.querySelector(sectionId);
  const box = document.querySelector(boxId);
  if(!(sec && box)) return;

  const textCol = sec.querySelector('.col-text');
  if(!textCol) return;

  const firstP = textCol.querySelector('.lead-body') || textCol.querySelector('p');
  if(!firstP) return;

  const secRect  = textCol.getBoundingClientRect();
  const pRect    = firstP.getBoundingClientRect();
  const offset   = Math.max(0, Math.round(pRect.top - secRect.top));

  box.style.marginTop = offset + 'px';
}
function doAlign(){ alignBox('#sobre','#sobre-box'); alignBox('#cuerpo','#cuerpo-box'); }
window.addEventListener('load', doAlign);
window.addEventListener('resize', doAlign);

