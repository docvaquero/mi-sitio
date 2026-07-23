// netlify/functions/mp-webhook.js
// POST /.netlify/functions/mp-webhook
// Recibe notificaciones de Mercado Pago, verifica el pago y confirma la reserva

const { confirmBooking } = require('./utils/confirm-booking');

exports.handler = async (event) => {
  // MP envía GET para validar la URL y POST para notificaciones reales
  if (event.httpMethod === 'GET') {
    return { statusCode: 200, body: 'ok' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let notification;
  try {
    notification = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Bad JSON' };
  }

  // MP envía distintos tipos de notificaciones; solo nos interesa "payment"
  if (notification.type !== 'payment') {
    return { statusCode: 200, body: 'ignored' };
  }

  const paymentId = notification?.data?.id;
  if (!paymentId) {
    return { statusCode: 200, body: 'no payment id' };
  }

  // Verificar el pago directamente con la API de MP (nunca confiar solo en el webhook)
  let payment;
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    if (!res.ok) {
      console.error('[mp-webhook] No se pudo obtener el pago', paymentId);
      return { statusCode: 200, body: 'could not verify payment' };
    }
    payment = await res.json();
  } catch (err) {
    console.error('[mp-webhook] Error al consultar MP:', err.message);
    return { statusCode: 200, body: 'error verifying' };
  }

  // Solo procesar pagos aprobados
  if (payment.status !== 'approved') {
    console.log(`[mp-webhook] Pago ${paymentId} no aprobado: ${payment.status}`);
    return { statusCode: 200, body: `payment status: ${payment.status}` };
  }

  const bookingId = payment.external_reference;
  if (!bookingId) {
    console.error('[mp-webhook] Pago sin external_reference:', paymentId);
    return { statusCode: 200, body: 'no external_reference' };
  }

  try {
    await confirmBooking(bookingId, 'mercadopago', String(paymentId));
  } catch (err) {
    console.error('[mp-webhook] Error al confirmar reserva:', err.message);
    // Devolvemos 200 para que MP no reintente; el error quedó en los logs
  }

  return { statusCode: 200, body: 'ok' };
};
