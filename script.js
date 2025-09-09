/* ========================= UTIL ========================= */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

/* ========================= 1) Año automático ========================= */
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

/* ========================= 3) Smooth scroll interno ========================= */
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const id = a.getAttribute('href').slice(1);
  const el = document.getElementById(id);
  if (el) {
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

/* ========================= 5) Parallax (hero, fullbleed y “foto dentro del marco”) ========================= */
(() => {
  const els = $$('[data-parallax]');
  if (!els.length) return;

  const onMove = (el, x, y) => {
    el.style.setProperty('--tx', (x * 0.04).toFixed(2) + 'px');
    el.style.setProperty('--ty', (y * 0.04).toFixed(2) + 'px');
  };

  els.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      onMove(el, e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2));
    });
    el.addEventListener('mouseleave', () => {
      el.style.setProperty('--tx','0px'); el.style.setProperty('--ty','0px');
    });
  });
})();

/* ========================= 6) Alineación exacta de la foto:
      - Arriba: a la altura del comienzo del cuerpo (párrafo lead)
      - Abajo: a la altura del link “Ver recursos →”
      Sin recortar ni deformar la imagen (se respeta el aspect ratio).
   ========================================================= */
(() => {
  const root = document.getElementById('sobre');
  if (!root) return;

  const copy      = document.getElementById('sobre-copy');
  const leadP     = copy ? copy.querySelector('.lead') : null;
  const endLink   = document.getElementById('sobre-link');
  const photoCol  = document.getElementById('sobre-photo-col');
  const frame     = document.getElementById('sobre-frame');
  const img       = document.getElementById('sobre-img');

  if (!(copy && leadP && endLink && photoCol && frame && img)) return;

  // Aseguramos conocer el aspect ratio natural de la imagen
  function getAR(){
    if (img.naturalWidth && img.naturalHeight) return img.naturalWidth / img.naturalHeight;
    // fallback por si aún no cargó
    return 768 / 1152;
  }

  function align(){
    const copyRect   = copy.getBoundingClientRect();
    const leadRect   = leadP.getBoundingClientRect();
    const endRect    = endLink.getBoundingClientRect();

    // 1) Margen superior = distancia desde el top del bloque de texto al inicio del cuerpo (lead)
    const topOffset = (leadRect.top - copyRect.top) + 0; // +0 px de respiro
    photoCol.style.marginTop = `${topOffset}px`;

    // 2) Altura del cuerpo de texto (desde lead hasta el borde inferior del link)
    const contentHeight = (endRect.bottom - copyRect.top) - (leadRect.top - copyRect.top);

    // 3) Dimensiones del frame para que la imagen COMPLETE hasta abajo, sin recortar
    const ar = getAR();
    let frameHeight = Math.max(240, contentHeight);     // piso visual
    let frameWidth  = frameHeight * ar;

    // Si el ancho calculado se pasa del ancho de su columna, lo limitamos
    const colWidth = photoCol.clientWidth || frame.parentElement.clientWidth;
    if (frameWidth > colWidth) {
      frameWidth  = colWidth;
      frameHeight = Math.round(frameWidth / ar);        // mantenemos proporción
    }

    frame.style.height = `${Math.round(frameHeight)}px`;
    frame.style.width  = `${Math.round(frameWidth)}px`;

    // La imagen se adapta con width/height 100% y object-fit: contain (sin recortes ni deformación)
  }

  // Ejecuta al cargar (si la imagen aún no está lista, recalcula al load)
  if (img.complete) align();
  else img.addEventListener('load', align, { once:true });

  window.addEventListener('resize', align, { passive:true });
})();

/* ========================= 7) Botón flotante “Volver arriba” ========================= */
(() => {
  let btnTop = document.querySelector('.to-top');
  if(!btnTop){
    btnTop = document.createElement('button');
    btnTop.type = 'button';
    btnTop.className = 'to-top';
    btnTop.setAttribute('aria-label', 'Volver arriba');
    btnTop.innerHTML = '<span aria-hidden="true">↑</span>';
    document.body.appendChild(btnTop);
  }

  const style = document.createElement('style');
  style.setAttribute('data-to-top','');
  style.textContent = `
    .to-top{
      position:fixed; right:26px; bottom:26px; z-index:9999;
      width:56px; height:56px; border-radius:50%;
      display:grid; place-items:center;
      font-size:22px; line-height:1; font-weight:900;
      border:none; cursor:pointer;
      background:#111; color:#fff;
      box-shadow:0 10px 24px rgba(0,0,0,.25);
      opacity:0; transform:translateY(10px) scale(.9); pointer-events:none;
      transition:opacity .28s ease, transform .28s ease, box-shadow .2s ease, background .2s ease;
    }
    .to-top.show{ opacity:1; transform:translateY(0) scale(1); pointer-events:auto; }
    .to-top:hover{ box-shadow:0 14px 30px rgba(0,0,0,.28); background:#222; }
    .to-top:active{ transform:translateY(1px) scale(.98); }
    .to-top:focus-visible{ outline:2px solid #fff; outline-offset:3px; }
    @media (max-width: 480px){
      .to-top{ width:52px; height:52px; font-size:20px; right:16px; bottom:16px; }
    }
    @media (prefers-color-scheme: dark){
      .to-top{ background:#ededf0; color:#0f1012; box-shadow:0 10px 24px rgba(0,0,0,.45); }
      .to-top:hover{ background:#d8d9e0; }
      .to-top:focus-visible{ outline:2px solid #0f1012; }
    }
    @media (prefers-reduced-motion: reduce){ .to-top{ transition:none; } }
  `;
  document.head.appendChild(style);

  const toggle = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (y > window.innerHeight * 0.35) btnTop.classList.add('show');
    else btnTop.classList.remove('show');
  };
  window.addEventListener('scroll', toggle, { passive:true });
  toggle();

  btnTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ========================= 8) Envío del form de Recursos (gracias in-page) ========================= */
(() => {
  const form = document.querySelector('#recursos form');
  const gracias = document.getElementById('gracias');
  if(!(form && gracias)) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const action = form.getAttribute('action');

    const res = await fetch(action, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    });

    if(res.ok){
      form.reset();
      gracias.style.display = 'block';
    } else {
      alert("Hubo un problema al enviar. Probá otra vez.");
    }
  });
})();
document.addEventListener("DOMContentLoaded", function () {
  const maxLength = 250; // caracteres visibles
  const blocks = document.querySelectorAll("#testimonios blockquote");

  blocks.forEach(block => {
    const fullText = block.innerHTML;
    if (fullText.length > maxLength) {
      const visibleText = fullText.slice(0, maxLength) + "...";
      
      // Creamos contenido recortado
      block.innerHTML = `
        <span class="short">${visibleText}</span>
        <span class="full" style="display:none;">${fullText}</span>
        <span class="read-more-btn">Leer más</span>
      `;
      
      // Lógica del botón
      const btn = block.querySelector(".read-more-btn");
      const short = block.querySelector(".short");
      const full = block.querySelector(".full");
      
      btn.addEventListener("click", () => {
        if (short.style.display === "none") {
          short.style.display = "inline";
          full.style.display = "none";
          btn.textContent = "Leer más";
        } else {
          short.style.display = "none";
          full.style.display = "inline";
          btn.textContent = "Leer menos";
        }
      });
    }
  });
});
