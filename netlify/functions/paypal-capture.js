// netlify/functions/paypal-capture.js
// GET /.netlify/functions/paypal-capture?token=ORDER_ID&bookingId=BOOKING_ID
// PayPal redirige al usuario aquí después de aprobar el pago.
// Capturamos el pago, confirmamos la reserva y redirigimos al usuario.

const { confirmBooking } = require('./utils/confirm-booking');

const SITE_URL = process.env.URL || 'https://docvaquero.com';

exports.handler = async (event) => {
  const { token, data } = event.queryStringParameters || {};

  if (!token || !data) {
    return redirect(`${SITE_URL}/agendar.html?estado=error`);
  }

  // Decodificar datos de reserva desde base64
  let booking;
  try {
    const raw = JSON.parse(Buffer.from(decodeURIComponent(data), 'base64').toString('utf8'));
    booking = { nombre: raw.n, email: raw.e, pais: raw.p, slotStart: raw.s, slotEnd: raw.t };
  } catch {
    console.error('[paypal-capture] No se pudo decodificar booking data');
    return redirect(`${SITE_URL}/agendar.html?estado=error`);
  }

  // Obtener token OAuth de PayPal
  let ppToken;
  try {
    ppToken = await getPaypalToken();
  } catch (err) {
    console.error('[paypal-capture] Error obteniendo token PayPal:', err.message);
    return redirect(`${SITE_URL}/agendar.html?estado=error`);
  }

  if (!ppToken) {
    return redirect(`${SITE_URL}/agendar.html?estado=error`);
  }

  // Capturar el pago (CAPTURE)
  let captureData;
  try {
    const res = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ppToken}`,
      },
    });
    captureData = await res.json();
  } catch (err) {
    console.error('[paypal-capture] Error al capturar pago:', err.message);
    return redirect(`${SITE_URL}/agendar.html?estado=error`);
  }

  if (captureData.status !== 'COMPLETED') {
    console.error('[paypal-capture] Pago no completado:', captureData.status);
    return redirect(`${SITE_URL}/agendar.html?estado=error`);
  }

  // Confirmar reserva
  try {
    await confirmBooking(booking, 'paypal', token);
  } catch (err) {
    console.error('[paypal-capture] Error al confirmar reserva:', err.message);
    // El pago ya fue capturado aunque la reserva haya fallado — registrar para revisar manualmente
  }

  return redirect(`${SITE_URL}/agendar.html?estado=ok`);
};

function redirect(url) {
  return {
    statusCode: 302,
    headers: { Location: url, 'Cache-Control': 'no-store' },
    body: '',
  };
}

async function getPaypalToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('PayPal credentials not configured');

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error(`PayPal token error: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}
