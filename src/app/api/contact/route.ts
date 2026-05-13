import { NextRequest, NextResponse } from 'next/server';

interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  service: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContactPayload;

    // Validate required fields
    if (!body.name || !body.email || !body.service) {
      return NextResponse.json(
        { error: 'Campos requeridos: nombre, email y servicio' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    // TODO: Integrate with email service (Resend, SendGrid, etc.)
    // Example with Resend:
    // import { Resend } from 'resend';
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'onboarding@resend.dev',
    //   to: process.env.CONTACT_EMAIL ?? 'hola@simvix.com',
    //   subject: `Solicitud de servicio: ${body.service} — ${body.name}`,
    //   html: `<p>Nombre: ${body.name}</p><p>Email: ${body.email}</p><p>Teléfono: ${body.phone ?? 'No proporcionado'}</p><p>Servicio: ${body.service}</p><p>Mensaje: ${body.message ?? 'Sin mensaje'}</p>`,
    // });

    // For now, log the contact request (replace with actual email sending)
    console.log('Contact form submission:', {
      name: body.name,
      email: body.email,
      phone: body.phone,
      service: body.service,
      message: body.message,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { message: 'Solicitud recibida correctamente' },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
