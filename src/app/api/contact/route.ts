import { NextRequest, NextResponse } from 'next/server';
import { leadSchema } from '@/lib/leads';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const campos = [...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? '')))];
    const sinConsentimiento = campos.includes('consentimiento');
    return NextResponse.json(
      {
        error: sinConsentimiento
          ? 'Necesitamos tu consentimiento para tratar tus datos'
          : 'Revisa los campos: nombre, email, servicio y zona',
        campos,
      },
      { status: 400 }
    );
  }
  const lead = parsed.data;

  // TODO: persistir el lead (o enviarlo por email con Resend/SendGrid). Hasta
  // entonces se registra en el log del servicio, como antes de esta fase;
  // ver docs/adr/0003 (Seguridad) para el plan de retirada de datos del log.
  console.log('Contact form submission:', {
    rol: lead.rol,
    zona: lead.zona,
    service: lead.service,
    origen: lead.origen,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    message: lead.message,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ message: 'Solicitud recibida correctamente' }, { status: 200 });
}
