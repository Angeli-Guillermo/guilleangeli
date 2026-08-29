export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { nombre, email, empresa, servicio, mensaje, 'bot-field': botField } = req.body || {};

  if (botField) {
    return res.status(200).json({ ok: true });
  }

  if (!nombre || !email) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
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
