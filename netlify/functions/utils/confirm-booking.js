// netlify/functions/utils/confirm-booking.js
// Lógica compartida: confirma reserva, crea evento en Google Calendar y envía emails

const { google } = require('googleapis');
const { Resend } = require('resend');

const TIMEZONE = 'America/Argentina/Buenos_Aires';
const DOCTOR_EMAIL = 'doc.federicovaquero@gmail.com';
const SLOT_DURATION_MIN = 50;

/**
 * Confirma una reserva pendiente:
 * 1. Marca como confirmada en Netlify Blobs
 * 2. Crea el evento en Google Calendar con Google Meet
 * 3. Envía emails de confirmación al paciente y al doctor
 */
async function confirmBooking(booking, paymentMethod, paymentId) {
  if (!booking) {
    console.error('[confirmBooking] Datos de reserva no recibidos');
    return;
  }

  // ── Google Calendar ──────────────────────────────────────────────────────────
  let meetLink = '';
  let eventHtmlLink = '';

  try {
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const calendar = google.calendar({ version: 'v3', auth });

    const eventRes = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      requestBody: {
        summary: `Consulta — ${booking.nombre}`,
        description: [
          `Email: ${booking.email}`,
          `País: ${booking.pais}`,
          `Teléfono: ${booking.telefono || '(no informado)'}`,
          `Motivo: ${booking.motivo || '(no informado)'}`,
          `Pago: ${paymentMethod} (${paymentId})`,
        ].join('\n'),
        start: { dateTime: booking.slotStart, timeZone: TIMEZONE },
        end: { dateTime: booking.slotEnd, timeZone: TIMEZONE },
        attendees: [
          { email: booking.email, displayName: booking.nombre },
          { email: DOCTOR_EMAIL, displayName: 'Doc Vaquero' },
        ],
        conferenceData: {
          createRequest: {
            requestId: `dv-${paymentId.toString().slice(0, 20)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      },
    });

    meetLink =
      eventRes.data.conferenceData?.entryPoints?.find(
        (e) => e.entryPointType === 'video'
      )?.uri ?? '';
    eventHtmlLink = eventRes.data.htmlLink ?? '';
  } catch (err) {
    console.error('[confirmBooking] Error al crear evento en Google Calendar:', err.message);
    // No lanzamos: el pago ya está confirmado, solo el calendario falló
  }

  // ── Formateo de fecha para los emails ────────────────────────────────────────
  const slotDate = new Date(booking.slotStart);
  const dateStr = slotDate.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: TIMEZONE,
  });
  const timeStr = slotDate.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  });

  // ── Emails con Resend ────────────────────────────────────────────────────────
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const meetRow = meetLink
      ? `<tr><td style="padding:4px 0;color:#6f7076">Google Meet</td><td style="padding:4px 0"><a href="${meetLink}" style="color:#111;font-weight:700">${meetLink}</a></td></tr>`
      : '';

    // Email al paciente
    await resend.emails.send({
      from: 'Doc Vaquero <turnos@auth.docvaquero.com>',
      to: booking.email,
      subject: '✅ Tu consulta está confirmada — Doc Vaquero',
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4efe9;font-family:system-ui,sans-serif">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:#111;padding:28px 32px">
    <p style="margin:0;color:rgba(255,255,255,.7);font-size:11px;letter-spacing:.18em;text-transform:uppercase">Doc Vaquero</p>
    <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:800">Tu consulta está confirmada</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="margin:0 0 16px">Hola <strong>${booking.nombre}</strong>,</p>
    <p style="margin:0 0 20px;color:#6f7076">Tu pago fue acreditado y tu lugar está reservado.</p>
    <table style="width:100%;border-collapse:collapse;background:#f4efe9;border-radius:8px;padding:16px" cellpadding="0" cellspacing="0">
      <tr><td colspan="2" style="padding:0 0 12px"><strong>Detalle de la consulta</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6f7076;white-space:nowrap;padding-right:16px">Fecha</td><td style="padding:4px 0">${dateStr}</td></tr>
      <tr><td style="padding:4px 0;color:#6f7076;white-space:nowrap;padding-right:16px">Hora</td><td style="padding:4px 0"><strong>${timeStr} hs</strong> (hora Argentina)</td></tr>
      <tr><td style="padding:4px 0;color:#6f7076;white-space:nowrap;padding-right:16px">Duración</td><td style="padding:4px 0">${SLOT_DURATION_MIN} minutos</td></tr>
      <tr><td style="padding:4px 0;color:#6f7076;white-space:nowrap;padding-right:16px">Modalidad</td><td style="padding:4px 0">Google Meet (online)</td></tr>
      ${meetRow}
      ${booking.motivo ? `<tr><td style="padding:4px 0;color:#6f7076;white-space:nowrap;padding-right:16px">Motivo</td><td style="padding:4px 0">${booking.motivo}</td></tr>` : ''}
    </table>
    ${meetLink ? '' : '<p style="margin:20px 0 0;color:#6f7076;font-size:14px">El link de Google Meet te va a llegar por la invitación de calendario en las próximas horas.</p>'}
    <p style="margin:24px 0 0;font-size:14px;color:#6f7076">¿Alguna duda? Respondé este email o escribime por WhatsApp.</p>
    <p style="margin:16px 0 0">Doc Vaquero</p>
  </div>
</div>
</body>
</html>`,
    });

    // Email al doctor
    await resend.emails.send({
      from: 'Sistema de Turnos <turnos@auth.docvaquero.com>',
      to: DOCTOR_EMAIL,
      subject: `🗓 Nueva consulta — ${booking.nombre} — ${timeStr} del ${dateStr}`,
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4efe9;font-family:system-ui,sans-serif">
<div style="max-width:520px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
  <div style="background:#111;padding:24px 32px">
    <p style="margin:0;color:#fff;font-weight:800;font-size:16px">Nueva consulta confirmada</p>
  </div>
  <div style="padding:24px 32px">
    <table style="width:100%;border-collapse:collapse" cellpadding="0" cellspacing="0">
      <tr><td style="padding:4px 0;color:#6f7076;padding-right:16px">Paciente</td><td style="padding:4px 0"><strong>${booking.nombre}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6f7076;padding-right:16px">Email</td><td style="padding:4px 0">${booking.email}</td></tr>
      <tr><td style="padding:4px 0;color:#6f7076;padding-right:16px">País</td><td style="padding:4px 0">${booking.pais}</td></tr>
      <tr><td style="padding:4px 0;color:#6f7076;padding-right:16px">Teléfono</td><td style="padding:4px 0">${booking.telefono || '—'}</td></tr>
      <tr><td style="padding:4px 0;color:#6f7076;padding-right:16px">Fecha</td><td style="padding:4px 0">${dateStr}</td></tr>
      <tr><td style="padding:4px 0;color:#6f7076;padding-right:16px">Hora</td><td style="padding:4px 0"><strong>${timeStr} hs</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6f7076;padding-right:16px">Pago</td><td style="padding:4px 0">${paymentMethod} · ${paymentId}</td></tr>
      ${meetLink ? `<tr><td style="padding:4px 0;color:#6f7076;padding-right:16px">Meet</td><td style="padding:4px 0"><a href="${meetLink}">${meetLink}</a></td></tr>` : ''}
      ${eventHtmlLink ? `<tr><td style="padding:4px 0;color:#6f7076;padding-right:16px">Calendario</td><td style="padding:4px 0"><a href="${eventHtmlLink}">Ver en Google Calendar</a></td></tr>` : ''}
      ${booking.motivo ? `<tr><td style="padding:4px 0;color:#6f7076;padding-right:16px;vertical-align:top">Motivo</td><td style="padding:4px 0">${booking.motivo}</td></tr>` : ''}
    </table>
  </div>
</div>
</body>
</html>`,
    });
  } catch (err) {
    console.error('[confirmBooking] Error al enviar emails:', err.message);
  }
}

module.exports = { confirmBooking };
