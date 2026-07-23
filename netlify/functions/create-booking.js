// netlify/functions/create-booking.js
// POST /api/create-booking
// Guarda reserva pendiente, crea preferencia de MP y orden de PayPal
// Devuelve { bookingId, mpUrl, paypalUrl }

const { getStore } = require('@netlify/blobs');

const SITE_URL = process.env.URL || 'https://docvaquero.com';
const PRICE_ARS = 65000;
const PRICE_USD = '55.00';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  // ── Parsear y validar input ──────────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const { nombre, email, pais, slotStart, slotEnd } = body;

  if (!nombre || !email || !pais || !slotStart || !slotEnd) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Faltan datos requeridos' }) };
  }

  // Validación básica de email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email inválido' }) };
  }

  // El slot no puede ser en el pasado
  if (new Date(slotStart) < new Date()) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'El horario seleccionado ya pasó' }) };
  }

  // ── Guardar reserva pendiente en Netlify Blobs ───────────────────────────────
  const bookingId = crypto.randomUUID();
  const store = getStore({ name: 'bookings', consistency: 'strong' });

  await store.setJSON(bookingId, {
    id: bookingId,
    nombre: nombre.trim().slice(0, 120),
    email: email.trim().toLowerCase().slice(0, 200),
    pais: pais.trim().slice(0, 80),
    slotStart,
    slotEnd,
    status: 'pending',
    createdAt: new Date().toISOString(),
    // Expira en 45 minutos (referencia; la limpieza se hace por status, no TTL)
    expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  });

  // ── Crear preferencia de Mercado Pago ────────────────────────────────────────
  let mpUrl = null;
  try {
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: 'Consulta con Doc Vaquero',
            quantity: 1,
            currency_id: 'ARS',
            unit_price: PRICE_ARS,
          },
        ],
        payer: { email: email.trim().toLowerCase() },
        external_reference: bookingId,
        back_urls: {
          success: `${SITE_URL}/agendar.html?estado=ok`,
          failure: `${SITE_URL}/agendar.html?estado=error`,
          pending: `${SITE_URL}/agendar.html?estado=pendiente`,
        },
        auto_return: 'approved',
        notification_url: `${SITE_URL}/.netlify/functions/mp-webhook`,
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      }),
    });

    if (mpRes.ok) {
      const mpData = await mpRes.json();
      mpUrl = mpData.init_point; // URL de pago producción
    } else {
      const err = await mpRes.text();
      console.error('[create-booking] MP error:', err);
    }
  } catch (err) {
    console.error('[create-booking] MP fetch error:', err.message);
  }

  // ── Crear orden de PayPal ────────────────────────────────────────────────────
  let paypalUrl = null;
  try {
    const ppToken = await getPaypalToken();
    if (ppToken) {
      const ppRes = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ppToken}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: { currency_code: 'USD', value: PRICE_USD },
              description: 'Consulta con Doc Vaquero',
              custom_id: bookingId,
            },
          ],
          application_context: {
            brand_name: 'Doc Vaquero',
            locale: 'es-AR',
            landing_page: 'LOGIN',
            user_action: 'PAY_NOW',
            return_url: `${SITE_URL}/.netlify/functions/paypal-capture?bookingId=${bookingId}`,
            cancel_url: `${SITE_URL}/agendar.html?estado=cancelado`,
          },
        }),
      });

      if (ppRes.ok) {
        const ppData = await ppRes.json();
        paypalUrl = ppData.links?.find((l) => l.rel === 'approve')?.href ?? null;
      } else {
        const err = await ppRes.text();
        console.error('[create-booking] PayPal error:', err);
      }
    }
  } catch (err) {
    console.error('[create-booking] PayPal fetch error:', err.message);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ bookingId, mpUrl, paypalUrl }),
  };
};

// ── Helper: obtiene token OAuth de PayPal ────────────────────────────────────
async function getPaypalToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}
