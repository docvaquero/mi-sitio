// FUNCIÓN DE DIAGNÓSTICO TEMPORAL — eliminá este archivo después de resolver el problema
const { google } = require('googleapis');

exports.handler = async () => {
  const result = { serviceAccount: null, calendarId: null, ok: false, error: null, details: null, eventId: null, meetLink: null };

  try {
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    result.serviceAccount = serviceAccountKey.client_email;
    result.calendarId = process.env.GOOGLE_CALENDAR_ID;

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });
    const calendar = google.calendar({ version: 'v3', auth });

    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 50 * 60 * 1000);

    const eventRes = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      conferenceDataVersion: 1,
      requestBody: {
        summary: 'TEST DIAGNÓSTICO — podés borrar este evento',
        description: 'Evento creado automáticamente para verificar la integración.',
        start: { dateTime: start.toISOString(), timeZone: 'America/Argentina/Buenos_Aires' },
        end:   { dateTime: end.toISOString(),   timeZone: 'America/Argentina/Buenos_Aires' },
        conferenceData: {
          createRequest: {
            requestId: `diag-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    result.ok = true;
    result.eventId = eventRes.data.id;
    result.meetLink = eventRes.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ?? null;
    result.htmlLink = eventRes.data.htmlLink;
  } catch (err) {
    result.error = err.message;
    result.details = err.response?.data ?? null;
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result, null, 2),
  };
};
