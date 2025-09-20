/* ================= Utils ================= */
(function(){
  'use strict';

  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  /* Año en footer */
  const y = $('#y'); if (y) y.textContent = new Date().getFullYear();

  /* Menú móvil */
  (function(){
    const btn = $('.menu'); const nav = $('.links');
    if (btn && nav) btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', String(open));
    });
  })();

  /* Smooth scroll */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href').slice(1); const el = document.getElementById(id);
    if (el){
      e.preventDefault();
      el.scrollIntoView({ behavior:'smooth', block:'start' });
      const nav=$('.links'), btn=$('.menu');
      if (nav && btn){ nav.classList.remove('open'); btn.setAttribute('aria-expanded','false'); }
    }
  });

  /* Reveal on scroll (con fallback) */
  (function(){
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window) || !els.length){
      els.forEach(el => el.classList.add('reveal--visible')); return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting){
          e.target.classList.add('reveal--visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold:0.12, rootMargin:'0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  })();

/* Parallax desktop (puntero) + móvil (scroll) */
(function(){
  const els = $$('[data-parallax]');
  if (!els.length) return;

  // Respeta accesibilidad
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const hover = window.matchMedia('(hover: hover)').matches;

  function set(el, x, y){
    el.style.setProperty('--tx', (x*0.04).toFixed(2)+'px'); // eje X suave
    el.style.setProperty('--ty', (y*0.06).toFixed(2)+'px'); // eje Y un poco más
  }

  if (hover){
    // DESKTOP/trackpad con puntero
    els.forEach(el => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        set(el, e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2));
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--tx','0px');
        el.style.setProperty('--ty','0px');
      });
    });
  } else {
    // MÓVIL: parallax por scroll (estable en iOS/Android)
    let ticking = false;
    function update(){
      const vh = window.innerHeight || document.documentElement.clientHeight;
      els.forEach(el => {
        const r = el.getBoundingClientRect();
        const centerY = r.top + r.height/2;
        const deltaY  = (vh/2) - centerY;   // distancia al centro
        set(el, 0, deltaY);                 // sólo Y en móvil
      });
      ticking = false;
    }
    function onScroll(){
      if (!ticking){ ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll, {passive:true});
    update(); // primera posición
  }
})();

  /* Efecto ventana (scroll) para .fullbleed: mueve background-position-y */
  (function(){
    const sections = Array.from(document.querySelectorAll('.fullbleed'));
    if (!sections.length) return;

    const FROM = 75; // coincide con --y inicial en CSS
    const TO   = 30;

    let ticking = false;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const lerp  = (a,b,t) => a + (b-a)*t;

    function update(){
      const vh = window.innerHeight || document.documentElement.clientHeight;
      sections.forEach(el => {
        const r = el.getBoundingClientRect();
        const margin = vh * 0.2;
        const start = vh - margin;
        const end   = - (r.height - margin);
        const t = clamp((start - r.top) / (start - end), 0, 1);
        const y = Math.round(lerp(FROM, TO, t));
        el.style.setProperty('--y', y + '%');
      });
      ticking = false;
    }
    function onScroll(){
      if (!ticking){
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll, {passive:true});
    update();
  })();

  /* Alineación foto “Sobre mí” */
  (function(){
    const copy=$('#sobre-copy');
    const lead=copy ? copy.querySelector('.lead') : null;
    const end=$('#sobre-link');
    const photo=$('#sobre-photo-col');
    const frame=$('#sobre-frame');
    const img=$('#sobre-img');
    if(!(copy&&lead&&end&&photo&&frame&&img)) return;

    function getAR(){ return (img.naturalWidth&&img.naturalHeight) ? (img.naturalWidth/img.naturalHeight) : (768/1152); }
    function align(){
      const cr=copy.getBoundingClientRect(), lr=lead.getBoundingClientRect(), er=end.getBoundingClientRect();
      photo.style.marginTop = `${(lr.top-cr.top)}px`;
      const contentH = (er.bottom - cr.top) - (lr.top - cr.top);
      const ar = getAR(); let h=Math.max(240, contentH), w=h*ar;
      const colW = photo.clientWidth || (frame.parentElement ? frame.parentElement.clientWidth : w);
      if (w>colW){ w=colW; h=Math.round(w/ar); }
      frame.style.height = `${Math.round(h)}px`; frame.style.width = `${Math.round(w)}px`;
    }
    if (img.complete) align(); else img.addEventListener('load', align, {once:true});
    window.addEventListener('resize', align, {passive:true});
  })();

  /* Botones flotantes: Volver arriba + WhatsApp (simétricos) */
  (function(){
    let topBtn = document.querySelector('.to-top');
    if(!topBtn){
      topBtn = document.createElement('button');
      topBtn.type='button';
      topBtn.className='to-top';
      topBtn.setAttribute('aria-label','Volver arriba');
      topBtn.innerHTML='<span aria-hidden="true">↑</span>';
      document.body.appendChild(topBtn);
    }
    let waBtn = document.querySelector('.to-whatsapp');
    if(!waBtn){
      waBtn = document.createElement('a');
      waBtn.href = 'https://wa.link/kcppfm';
      waBtn.target = '_blank';
      waBtn.rel = 'noopener';
      waBtn.className = 'to-whatsapp';
      waBtn.setAttribute('aria-label','WhatsApp');
      waBtn.innerHTML = '<img src="logo-blanco-whatsapp.png" alt="WhatsApp">';
      document.body.appendChild(waBtn);
    }
    const style = document.createElement('style');
    style.setAttribute('data-floating-btns','');
    style.textContent = `
      .to-top, .to-whatsapp{
        position:fixed; bottom:26px; z-index:9999;
        width:56px; height:56px; border-radius:50%;
        display:grid; place-items:center; border:none; cursor:pointer;
        box-shadow:0 10px 24px rgba(0,0,0,.25); transition:.28s;
        background:#111; color:#fff;
        opacity:0; transform:translateY(10px) scale(.9); pointer-events:none;
      }
      .to-top.show, .to-whatsapp.show{
        opacity:1; transform:translateY(0) scale(1); pointer-events:auto;
      }
      .to-top:hover, .to-whatsapp:hover{
        box-shadow:0 14px 30px rgba(0,0,0,.28); background:#222;
      }
      .to-top{ right:26px; font-size:22px; font-weight:900; }
      .to-whatsapp{ left:26px; }
      .to-whatsapp img{ width:26px; height:26px; display: block; filter: none; }
      @media(max-width:480px){
        .to-top, .to-whatsapp{ width:52px; height:52px }
        .to-top{ right:16px; }
        .to-whatsapp{ left:16px; }
      }
    `;
    document.head.appendChild(style);

    const toggle = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      if(y > window.innerHeight * .35){
        topBtn.classList.add('show'); waBtn.classList.add('show');
      }else{
        topBtn.classList.remove('show'); waBtn.classList.remove('show');
      }
    };
    window.addEventListener('scroll', toggle, { passive:true });
    toggle();

    topBtn.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
  })();

  /* Carrusel por fundido (sección 6 – galería de 3 imágenes) */
  (function(){
    const root = document.querySelector('.carousel-fade');
    if(!root) return;

    const slides = Array.from(root.querySelectorAll('.slide'));
    if (slides.length < 2) return;

    const INTERVALO = 3000;  // 3 segundos exactos
    let idx = slides.findIndex(s => s.classList.contains('is-active'));
    if (idx < 0) idx = 0;
    let t1 = null, tLoop = null;

    function show(n){
      slides[idx].classList.remove('is-active');
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.add('is-active');
    }

    function stop(){
      if (t1){ clearTimeout(t1); t1 = null; }
      if (tLoop){ clearInterval(tLoop); tLoop = null; }
    }

    function start(){
      stop();
      t1 = setTimeout(() => {
        show(idx + 1);
        tLoop = setInterval(() => show(idx + 1), INTERVALO);
      }, INTERVALO);
    }

    const firstImg = slides[0].querySelector('img');
    if (firstImg && !firstImg.complete){
      firstImg.addEventListener('load', start, {once:true});
      firstImg.addEventListener('error', start, {once:true});
    } else {
      start();
    }

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });
  })();

  /* Testimonios: “Seguir leyendo / Leer menos” (estructura segura) */
  document.addEventListener('DOMContentLoaded', () => {
    const items = document.querySelectorAll('#testimonios blockquote');
    items.forEach(b => {
      const clone = b.cloneNode(true);
      const lastSpan = clone.querySelector('span:last-of-type');
      const authorText = lastSpan ? lastSpan.textContent : '';
      if (lastSpan) lastSpan.remove();
      const textHTML = clone.innerHTML.trim();
      b.innerHTML = `
        <p class="q">${textHTML}</p>
        ${authorText ? `<span class="author">${authorText}</span>` : ''}
        <button class="more" type="button">Seguir leyendo</button>
      `;
      const btn = b.querySelector('.more');
      btn.addEventListener('click', () => {
        const opened = b.classList.toggle('open');
        btn.textContent = opened ? 'Leer menos' : 'Seguir leyendo';
      });
    });
  });

  /* Carrusel de Testimonios: scroll manual + autoavance sin romper “leer más” */
  (function(){
    const viewport = document.querySelector('#testimonios .quotes-viewport');
    const track    = document.querySelector('#testimonios .quotes-track');
    if(!viewport || !track) return;

    const INTERVAL = 5000;   // cada 5s pasa de “página”
    let perView = 1;         // 3 en desktop, 1 en mobile
    let pages   = 1;         // cantidad de páginas
    let page    = 0;         // página actual
    let timer   = null;

    const isDesktop = () => window.matchMedia('(min-width:900px)').matches;

    // Ancho EXACTO de una “página” midiendo posiciones reales (respeta gaps)
    function pageWidth(){
      const items = track.children;
      if (!items.length) return viewport.clientWidth;

      perView = isDesktop() ? 3 : 1;

      if (items.length <= perView){
        return viewport.clientWidth;
      }
      const aLeft = items[0].offsetLeft;
      const bLeft = items[perView].offsetLeft;
      return Math.max(1, bLeft - aLeft);
    }

    function compute(){
      const total = track.children.length;
      perView = isDesktop() ? 3 : 1;
      pages   = Math.max(1, Math.ceil(total / perView));
      page    = Math.min(page, pages - 1);
      viewport.scrollLeft = page * pageWidth(); // posiciona sin animación
    }

    function go(n, smooth=true){
      page = (n + pages) % pages;
      const x = page * pageWidth();
      if (smooth){
        viewport.scrollTo({ left:x, behavior:'smooth' });
      } else {
        viewport.scrollLeft = x;
      }
    }

    function play(){ stop(); timer = setInterval(() => go(page+1, true), INTERVAL); }
    function stop(){ if(timer){ clearInterval(timer); timer = null; } }

    // Pausa el autoavance si el usuario interactúa; reanuda al salir
    viewport.addEventListener('mouseenter', stop, {passive:true});
    viewport.addEventListener('mouseleave', play, {passive:true});

    // Convierte rueda vertical en scroll horizontal (útil en desktop)
    viewport.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)){
        e.preventDefault();
        viewport.scrollLeft += e.deltaY;
      }
    }, {passive:false});

    // Al terminar el scroll manual, “encastrá” a la página más cercana
    let snapTO = null;
    viewport.addEventListener('scroll', () => {
      if (snapTO){ clearTimeout(snapTO); }
      snapTO = setTimeout(() => {
        const pw = pageWidth();
        const newPage = Math.round(viewport.scrollLeft / pw);
        go(newPage, true);
      }, 140);
    }, {passive:true});

    // Responsive y pestaña oculta
    window.addEventListener('resize', () => { stop(); compute(); go(page,false); play(); }, {passive:true});
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : play());

    // Inicio tras cargar layout (asegura medidas correctas)
    window.addEventListener('load', () => { compute(); go(page,false); play(); });
  })();

})();
