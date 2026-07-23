// netlify/functions/get-slots.js
// GET /api/get-slots?date=YYYY-MM-DD
// Devuelve los horarios disponibles para la fecha indicada

const { google } = require('googleapis');

const TIMEZONE = 'America/Argentina/Buenos_Aires';
const WORK_START_H = 10; // 10:00 hs
const WORK_END_H = 20;   // 20:00 hs (el último slot empieza a las 19:00, termina a las 19:50)
const SLOT_MIN = 50;     // duración en minutos

// Argentina no usa horario de verano — siempre UTC-3
const TZ_OFFSET = '-03:00';

exports.handler = async (event) => {
  // CORS para dev local
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const date = event.queryStringParameters?.date; // YYYY-MM-DD
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Parámetro date requerido (YYYY-MM-DD)' }),
    };
  }

  // Rango del día en horario laboral
  const timeMin = `${date}T${pad(WORK_START_H)}:00:00${TZ_OFFSET}`;
  const timeMax = `${date}T${pad(WORK_END_H)}:00:00${TZ_OFFSET}`;

  let busyPeriods = [];
  try {
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
    const calendar = google.calendar({ version: 'v3', auth });

    const freebusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: TIMEZONE,
        items: [{ id: process.env.GOOGLE_CALENDAR_ID }],
      },
    });

    busyPeriods =
      freebusyRes.data.calendars?.[process.env.GOOGLE_CALENDAR_ID]?.busy ?? [];
  } catch (err) {
    console.error('[get-slots] Error Google Calendar:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'No se pudo consultar disponibilidad' }),
    };
  }

  const now = new Date();
  // Agregar 1 hora de margen para que no aparezcan slots inminentes
  const minAllowedStart = new Date(now.getTime() + 60 * 60 * 1000);

  const slots = [];
  // Slots cada hora: 10:00, 11:00, ..., 19:00 (último termina a las 19:50)
  for (let h = WORK_START_H; h + SLOT_MIN / 60 <= WORK_END_H; h++) {
    const slotStart = new Date(`${date}T${pad(h)}:00:00${TZ_OFFSET}`);
    const slotEnd = new Date(slotStart.getTime() + SLOT_MIN * 60 * 1000);

    // No mostrar slots pasados o que ya empiezan en menos de 1 hora
    if (slotStart < minAllowedStart) continue;

    // Verificar que no se superponga con ningún período ocupado
    const isOverlapping = busyPeriods.some((b) => {
      const busyStart = new Date(b.start);
      const busyEnd = new Date(b.end);
      return slotStart < busyEnd && slotEnd > busyStart;
    });

    if (!isOverlapping) {
      slots.push({
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        label: `${pad(h)}:00`,
      });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ slots }),
  };
};

function pad(n) {
  return String(n).padStart(2, '0');
}
