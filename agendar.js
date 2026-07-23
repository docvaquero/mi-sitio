/* ============================================================
   agendar.js — Sistema de turnos Doc Vaquero
   Lógica de la página de agendado: calendario, slots, form, pago
   ============================================================ */

(function () {
  'use strict';

  // ── Estado global ────────────────────────────────────────────────────────────
  const state = {
    year: null,
    month: null,      // 0-based
    selectedDate: null,  // 'YYYY-MM-DD'
    selectedSlot: null,  // { start, end, label }
    bookingId: null,
    mpUrl: null,
    paypalUrl: null,
  };

  // ── Detectar estados de retorno de pago ─────────────────────────────────────
  const params = new URLSearchParams(window.location.search);
  const estado = params.get('estado');
  if (estado) {
    document.getElementById('flujo-principal').style.display = 'none';
    const map = {
      ok: 'estado-ok',
      error: 'estado-error',
      pendiente: 'estado-pendiente',
      cancelado: 'estado-cancelado',
    };
    const secId = map[estado];
    if (secId) {
      const sec = document.getElementById(secId);
      if (sec) sec.style.display = '';
    }
    return; // no inicializar el flujo de turnos
  }

  // ── Inicializar calendario con el mes actual ─────────────────────────────────
  const today = new Date();
  state.year = today.getFullYear();
  state.month = today.getMonth();

  renderCalendar();

  // ── Botones de navegación del calendario ─────────────────────────────────────
  document.getElementById('cal-prev').addEventListener('click', () => {
    const min = new Date(today.getFullYear(), today.getMonth(), 1);
    const current = new Date(state.year, state.month, 1);
    current.setMonth(current.getMonth() - 1);
    if (current >= min) {
      state.year = current.getFullYear();
      state.month = current.getMonth();
      renderCalendar();
    }
  });

  document.getElementById('cal-next').addEventListener('click', () => {
    // Máximo 8 semanas hacia adelante
    const max = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    const current = new Date(state.year, state.month, 1);
    current.setMonth(current.getMonth() + 1);
    if (current < max) {
      state.year = current.getFullYear();
      state.month = current.getMonth();
      renderCalendar();
    }
  });

  // ── Botones "volver" ─────────────────────────────────────────────────────────
  document.querySelectorAll('.back-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetPaso = Number(btn.dataset.back);
      goToPaso(targetPaso);
    });
  });

  // ── Formulario de datos personales ──────────────────────────────────────────
  const selectPais = document.getElementById('pais');
  const campoPaisOtro = document.getElementById('campo-pais-otro');
  const inputPaisOtro = document.getElementById('pais-otro');

  selectPais.addEventListener('change', () => {
    const isOtro = selectPais.value === 'Otro';
    campoPaisOtro.style.display = isOtro ? '' : 'none';
    inputPaisOtro.required = isOtro;
  });

  document.getElementById('form-datos').addEventListener('submit', async (e) => {
    e.preventDefault();
    hideFormError();

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const paisSelect = selectPais.value;
    const paisOtro = inputPaisOtro.value.trim();
    const pais = paisSelect === 'Otro' ? (paisOtro || 'Otro') : paisSelect;

    if (!nombre || !email || !pais) {
      showFormError('Por favor completá todos los campos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFormError('El email no parece válido.');
      return;
    }

    const btn = document.getElementById('btn-continuar');
    btn.disabled = true;
    btn.textContent = 'Procesando…';

    try {
      const res = await fetch('/api/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          email,
          pais,
          slotStart: state.selectedSlot.start,
          slotEnd: state.selectedSlot.end,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showFormError(data.error || 'Hubo un problema. Intentá de nuevo.');
        return;
      }

      state.bookingId = data.bookingId;
      state.mpUrl = data.mpUrl;
      state.paypalUrl = data.paypalUrl;

      // Mostrar resumen en paso 4
      document.getElementById('paso-4-resumen').textContent = buildResumen();
      goToPaso(4);
      mostrarOpciones(pais);
    } catch (err) {
      showFormError('Error de conexión. Intentá de nuevo.');
      console.error(err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Continuar al pago →';
    }
  });

  // ── Funciones del flujo de pasos ────────────────────────────────────────────

  function goToPaso(n) {
    for (let i = 1; i <= 4; i++) {
      const paso = document.getElementById(`paso-${i}`);
      if (paso) paso.style.display = i === n ? '' : 'none';
    }
    updateStepIndicator(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateStepIndicator(current) {
    document.querySelectorAll('.step').forEach((el) => {
      const n = Number(el.dataset.step);
      el.classList.remove('active', 'done');
      if (n === current) el.classList.add('active');
      else if (n < current) el.classList.add('done');
    });
  }

  // ── Render del calendario ────────────────────────────────────────────────────

  function renderCalendar() {
    const MONTHS_ES = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    document.getElementById('cal-month-label').textContent =
      `${MONTHS_ES[state.month]} ${state.year}`;

    const container = document.getElementById('cal-days');
    container.innerHTML = '';

    // Primer día del mes (0=Dom, 1=Lun, ..., 6=Sáb)
    const firstDay = new Date(state.year, state.month, 1).getDay();
    const daysInMonth = new Date(state.year, state.month + 1, 0).getDate();

    // Máximo: hoy + 8 semanas
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 8 * 7);

    // Celdas vacías iniciales
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day cal-day--empty';
      container.appendChild(cell);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(state.year, state.month, d);
      const dateStr = toDateStr(date);
      const dow = date.getDay(); // 0=Dom, 6=Sáb

      const cell = document.createElement('button');
      cell.type = 'button';
      cell.textContent = d;
      cell.className = 'cal-day';

      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isWeekend = dow === 0 || dow === 6;
      const isBeyondMax = date > maxDate;
      const isToday = dateStr === toDateStr(today);

      if (isToday) cell.classList.add('cal-day--today');

      if (isPast || isWeekend || isBeyondMax) {
        cell.classList.add(isWeekend ? 'cal-day--weekend' : 'cal-day--past');
        cell.disabled = true;
      } else {
        cell.classList.add('cal-day--available');
        if (dateStr === state.selectedDate) cell.classList.add('cal-day--selected');
        cell.addEventListener('click', () => onDateSelected(dateStr, cell));
        cell.setAttribute('aria-label', `${d} de ${MONTHS_ES[state.month]}`);
      }

      container.appendChild(cell);
    }
  }

  async function onDateSelected(dateStr, cell) {
    // Desmarcar anterior
    document.querySelectorAll('.cal-day--selected').forEach((el) => {
      el.classList.remove('cal-day--selected');
    });
    cell.classList.add('cal-day--selected');

    state.selectedDate = dateStr;
    state.selectedSlot = null;

    // Mostrar fecha en paso 2
    const [y, m, d] = dateStr.split('-').map(Number);
    const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const fecha = new Date(y, m - 1, d);
    const fechaStr = `${DIAS[fecha.getDay()]} ${d} de ${MESES[m - 1]} de ${y}`;

    document.getElementById('paso-2-fecha').textContent =
      `Horarios disponibles para el ${fechaStr} · hora Argentina`;

    goToPaso(2);
    await fetchSlots(dateStr);
  }

  // ── Fetch de slots disponibles ───────────────────────────────────────────────

  async function fetchSlots(dateStr) {
    const loading = document.getElementById('slots-loading');
    const empty = document.getElementById('slots-empty');
    const grid = document.getElementById('slots-grid');

    loading.style.display = 'flex';
    empty.style.display = 'none';
    grid.innerHTML = '';

    try {
      const res = await fetch(`/api/get-slots?date=${dateStr}`);
      const data = await res.json();

      loading.style.display = 'none';

      if (!res.ok || !data.slots?.length) {
        empty.style.display = '';
        return;
      }

      data.slots.forEach((slot) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot-btn';
        btn.textContent = slot.label;
        btn.setAttribute('aria-label', `Horario ${slot.label}`);
        btn.addEventListener('click', () => onSlotSelected(slot, btn));
        grid.appendChild(btn);
      });
    } catch (err) {
      loading.style.display = 'none';
      empty.textContent = 'No se pudo cargar la disponibilidad. Recargá la página.';
      empty.style.display = '';
      console.error(err);
    }
  }

  function onSlotSelected(slot, btn) {
    document.querySelectorAll('.slot-btn.selected').forEach((el) => {
      el.classList.remove('selected');
    });
    btn.classList.add('selected');
    state.selectedSlot = slot;

    // Actualizar resumen en paso 3
    document.getElementById('paso-3-resumen').textContent =
      `${formatFechaSlot(slot.start)} · ${slot.label} hs · 50 min`;

    goToPaso(3);
  }

  // ── Mostrar opciones de pago ─────────────────────────────────────────────────

  function mostrarOpciones(pais) {
    const loadingEl = document.getElementById('pago-loading');
    const opcionesEl = document.getElementById('pago-opciones');
    const btnMp = document.getElementById('btn-mp');
    const btnPp = document.getElementById('btn-pp');
    const pagoError = document.getElementById('pago-error');

    loadingEl.style.display = 'none';
    opcionesEl.style.display = '';

    const esArgentina = pais === 'Argentina';

    if (esArgentina && state.mpUrl) {
      btnMp.href = state.mpUrl;
      btnMp.style.display = '';
    } else if (!esArgentina && state.paypalUrl) {
      btnPp.href = state.paypalUrl;
      btnPp.style.display = '';
    } else if (state.mpUrl) {
      // Fallback: mostrar MP si no hay PayPal
      btnMp.href = state.mpUrl;
      btnMp.style.display = '';
    } else if (state.paypalUrl) {
      btnPp.href = state.paypalUrl;
      btnPp.style.display = '';
    } else {
      pagoError.style.display = '';
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatFechaSlot(isoStr) {
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  }

  function buildResumen() {
    if (!state.selectedSlot) return '';
    return `${formatFechaSlot(state.selectedSlot.start)} · ${state.selectedSlot.label} hs · 50 min`;
  }

  function showFormError(msg) {
    const el = document.getElementById('form-error');
    el.textContent = msg;
    el.style.display = '';
  }

  function hideFormError() {
    const el = document.getElementById('form-error');
    el.style.display = 'none';
    el.textContent = '';
  }
})();
