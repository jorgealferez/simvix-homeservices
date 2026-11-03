import { NextRequest, NextResponse } from 'next/server';
import { leadSchema } from '@/lib/leads';
import { guardarLead, resumenLead } from '@/lib/leads-store';
import { crearLimitador, ipDe } from '@/lib/rate-limit';

/** 5 envíos por IP cada 10 minutos (ADR 0006). */
const permitir = crearLimitador(5, 10 * 60 * 1000);

export async function POST(request: NextRequest) {
  if (!permitir(ipDe(request.headers))) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Inténtalo en unos minutos o llámanos.' },
      { status: 429, headers: { 'Retry-After': '600' } }
    );
  }

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

  const resultado = await guardarLead(lead);
  if (resultado.guardado) {
    console.log('Lead guardado:', { id: resultado.id, ...resumenLead(lead) });
  } else {
    // Sin base de datos (o con la BD caída) el lead no se pierde: se conserva en
    // el log como antes de la Fase 4, marcado para recuperarlo. Deja de ocurrir
    // en cuanto el servicio tiene DATABASE_URL (ADR 0006).
    console.warn('Lead SIN GUARDAR en BD, conservado en log:', {
      motivo: resultado.motivo,
      ...resumenLead(lead),
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      timestamp: new Date().toISOString(),
    });
  }

  return NextResponse.json({ message: 'Solicitud recibida correctamente' }, { status: 200 });
}
