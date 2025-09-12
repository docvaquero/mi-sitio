/* ================= Utils ================= */
(function(){
  'use strict';
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  /* Año */
  const y = $('#y'); if (y) y.textContent = new Date().getFullYear();

  /* Menú móvil */
  const btn = $('.menu'); const nav = $('.links');
  if (btn && nav) btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', open);
  });

  /* Smooth scroll */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return;
    const id = a.getAttribute('href').slice(1); const el = document.getElementById(id);
    if (el){ e.preventDefault(); el.scrollIntoView({ behavior:'smooth', block:'start' });
      if (nav && btn){ nav.classList.remove('open'); btn.setAttribute('aria-expanded','false'); } }
  });

  /* Reveal on scroll */
  (function(){
    const els = $$('.reveal');
    if (!('IntersectionObserver' in window) || !els.length){
      els.forEach(el => el.classList.add('reveal--visible')); return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('reveal--visible'); io.unobserve(e.target); } });
    }, { threshold:0.12, rootMargin:'0px 0px -8% 0px' });
    els.forEach(el => io.observe(el));
  })();

  /* Parallax (hero/fullbleed y marcos con data-parallax) */
  (function(){
    const els = $$('[data-parallax]'); if (!els.length) return;
    const onMove = (el, x, y) => {
      el.style.setProperty('--tx',(x*0.04).toFixed(2)+'px');
      el.style.setProperty('--ty',(y*0.04).toFixed(2)+'px');
    };
    els.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        onMove(el, e.clientX-(r.left+r.width/2), e.clientY-(r.top+r.height/2));
      });
      el.addEventListener('mouseleave', () => {
        el.style.setProperty('--tx','0px'); el.style.setProperty('--ty','0px');
      });
    });
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
  // ------- Volver arriba -------
  let topBtn = document.querySelector('.to-top');
  if(!topBtn){
    topBtn = document.createElement('button');
    topBtn.type='button';
    topBtn.className='to-top';
    topBtn.setAttribute('aria-label','Volver arriba');
    topBtn.innerHTML='<span aria-hidden="true">↑</span>';
    document.body.appendChild(topBtn);
  }

  // ------- WhatsApp simétrico -------
  let waBtn = document.querySelector('.to-whatsapp');
  if(!waBtn){
    waBtn = document.createElement('a');
    waBtn.href = 'https://wa.link/kcppfm'; // tu enlace
    waBtn.target = '_blank';
    waBtn.rel = 'noopener';
    waBtn.className = 'to-whatsapp';
    waBtn.setAttribute('aria-label','WhatsApp');
    waBtn.innerHTML = '<img src="logo-blanco-whatsapp.png" alt="WhatsApp">';
    document.body.appendChild(waBtn);
  }

  // ------- Estilos inyectados -------
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

    /* Responsive */
    @media(max-width:480px){
      .to-top, .to-whatsapp{ width:52px; height:52px }
      .to-top{ right:16px; }
      .to-whatsapp{ left:16px; }
    }


  `;
  document.head.appendChild(style);

  // Mostrar/ocultar ambos botones juntos
  const toggle = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if(y > window.innerHeight * .35){
      topBtn.classList.add('show');
      waBtn.classList.add('show');
    }else{
      topBtn.classList.remove('show');
      waBtn.classList.remove('show');
    }
  };
  window.addEventListener('scroll', toggle, { passive:true });
  toggle();

  // Scroll suave al inicio
  topBtn.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
})();

  /* Form Recursos (gracias inline) */
  (function(){
    const form = document.querySelector('#recursos form'); const gracias = document.getElementById('gracias');
    if(!(form&&gracias)) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = new FormData(form); const action = form.getAttribute('action');
      try{
        const res = await fetch(action, { method:'POST', body:data, headers:{'Accept':'application/json'} });
        if(res.ok){ form.reset(); gracias.style.display='block'; } else { alert("Hubo un problema al enviar. Probá otra vez."); }
      }catch(_){ alert("Sin conexión. Intentá nuevamente."); }
    });
  })();

  /* Testimonios: “Seguir leyendo / Leer menos” (no se rompe si falta <span>) */
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

})();
