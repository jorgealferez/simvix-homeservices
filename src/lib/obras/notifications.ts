import { createHmac } from 'node:crypto';
import { prisma } from '@/lib/db';

/**
 * P19 — Notificaciones.
 *
 * Tres canales:
 *   1. in-app: persistido en `Notification`, expuesto vía /api/notifications.
 *   2. email: si OBRAS_RESEND_API_KEY está definido, envía vía Resend.
 *   3. webhook: POST firmado HMAC-SHA256 a cada WebhookEndpoint suscrito al
 *      tipo del evento dentro de la organización.
 *
 * El servicio falla gracefully: si un canal falla, el resto sigue.
 */

export interface NotifyParams {
  userId?: string;
  email?: string;
  orgId?: string;
  projectId?: string;
  type: string;
  title: string;
  body: string;
  /** Datos extra que viajan al webhook (no se muestran al usuario). */
  payload?: Record<string, unknown>;
}

export async function notify(params: NotifyParams) {
  const channels: string[] = ['in-app'];
  const delivery: Record<string, unknown> = {};

  // in-app
  const inApp = params.userId
    ? await prisma.notification.create({
        data: {
          userId: params.userId,
          orgId: params.orgId,
          projectId: params.projectId,
          type: params.type,
          title: params.title,
          body: params.body,
          channels: 'in-app',
        },
      })
    : null;

  // email (opcional)
  if (params.email && process.env.OBRAS_RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${process.env.OBRAS_RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.OBRAS_EMAIL_FROM ?? 'no-reply@simvix.com',
          to: params.email,
          subject: params.title,
          text: params.body,
        }),
      });
      delivery.email = { ok: res.ok, status: res.status };
      channels.push('email');
    } catch (e) {
      delivery.email = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  // webhooks de la org
  if (params.orgId) {
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { orgId: params.orgId, active: true },
    });
    const matching = endpoints.filter((ep) =>
      ep.events.split(',').some((e) => e.trim() === params.type),
    );
    const webhookResults: Array<{ url: string; ok: boolean; status?: number; error?: string }> = [];
    await Promise.all(
      matching.map(async (ep) => {
        const body = JSON.stringify({
          type: params.type,
          title: params.title,
          body: params.body,
          payload: params.payload ?? {},
          orgId: params.orgId,
          projectId: params.projectId,
          timestamp: new Date().toISOString(),
        });
        const sig = createHmac('sha256', ep.secret).update(body).digest('hex');
        try {
          const res = await fetch(ep.url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-simvix-signature': sig,
              'x-simvix-event': params.type,
            },
            body,
            signal: AbortSignal.timeout(10_000),
          });
          webhookResults.push({ url: ep.url, ok: res.ok, status: res.status });
        } catch (e) {
          webhookResults.push({
            url: ep.url,
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }),
    );
    if (webhookResults.length) {
      delivery.webhooks = webhookResults;
      channels.push('webhook');
    }
  }

  if (inApp && (delivery.email || delivery.webhooks)) {
    await prisma.notification.update({
      where: { id: inApp.id },
      data: {
        channels: channels.join(','),
        deliveryJson: JSON.stringify(delivery),
      },
    });
  }

  return { notification: inApp, delivery };
}

/** HMAC signing check para verify del lado receptor (ejemplo / tests). */
export function verifyHmac(body: string, secret: string, signatureHex: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  return expected === signatureHex;
}
