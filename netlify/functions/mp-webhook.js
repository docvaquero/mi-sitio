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

  // Decodificar datos de reserva desde external_reference (JSON compacto)
  let booking;
  try {
    const raw = JSON.parse(payment.external_reference);
    booking = { nombre: raw.n, email: raw.e, pais: raw.p, slotStart: raw.s, slotEnd: raw.t, telefono: raw.f, motivo: raw.m };
  } catch {
    console.error('[mp-webhook] external_reference no es JSON válido:', payment.external_reference);
    return { statusCode: 200, body: 'invalid external_reference' };
  }

  try {
    await confirmBooking(booking, 'mercadopago', String(paymentId));
  } catch (err) {
    console.error('[mp-webhook] Error al confirmar reserva:', err.message);
    // Devolvemos 200 para que MP no reintente; el error quedó en los logs
  }

  return { statusCode: 200, body: 'ok' };
};
