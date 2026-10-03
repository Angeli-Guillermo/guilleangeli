// Auditoria extrema 02-oct-2026 (Codex): el endpoint aceptaba POST de
// cualquiera sin limite de frecuencia ni validar el formato del email --
// alguien podia hacer curl directo y agotar la cuota de Resend (plan free:
// 100 emails/dia) o spamear la bandeja. Rate limit simple en memoria por IP:
// vive solo mientras la funcion serverless este "caliente" (no es a prueba de
// instancias frias ni distribuido), pero sube el costo de un abuso casual lo
// suficiente para este sitio personal -- no amerita Redis/KV para este caso.
const intentosPorIp = new Map();
const VENTANA_MS = 10 * 60 * 1000;
const MAX_INTENTOS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function rateLimitExcedido(ip) {
  const ahora = Date.now();
  const previos = (intentosPorIp.get(ip) || []).filter(t => ahora - t < VENTANA_MS);
  previos.push(ahora);
  intentosPorIp.set(ip, previos);
  return previos.length > MAX_INTENTOS;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'desconocida';
  if (rateLimitExcedido(ip)) {
    return res.status(429).json({ error: 'Demasiados intentos, probá de nuevo más tarde' });
  }

  const { nombre, email, empresa, servicio, mensaje, 'bot-field': botField } = req.body || {};

  if (botField) {
    return res.status(200).json({ ok: true });
  }

  if (!nombre || !email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Faltan campos requeridos o el email no es válido' });
  }

  if (mensaje && mensaje.length > 5000) {
    return res.status(400).json({ error: 'Mensaje demasiado largo' });
  }

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Guille Angeli Fotografía <onboarding@resend.dev>',
        to: ['guillermoangeli83@gmail.com'],
        reply_to: email,
        subject: `Nuevo contacto de ${nombre}`,
        text: [
          `Nombre: ${nombre}`,
          `Email: ${email}`,
          empresa ? `Empresa: ${empresa}` : null,
          servicio ? `Servicio: ${servicio}` : null,
          '',
          mensaje || '(sin mensaje)',
        ].filter(Boolean).join('\n'),
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error('Resend error:', detail);
      return res.status(502).json({ error: 'No se pudo enviar el email' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'Error interno' });
  }
}
