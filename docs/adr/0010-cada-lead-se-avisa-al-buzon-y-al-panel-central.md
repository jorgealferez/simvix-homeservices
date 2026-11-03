# ADR 0010 — Cada lead se avisa al buzón y al panel central con su origen

- **Estado:** aceptado
- **Fecha:** 2026-11-03
- **Fase:** 5
- **Decide:** Constructor, auditado por el Critico

## Contexto
Petición del usuario (2026-11-03): todos los contactos de cualquier web del grupo, además de su
función propia, deben llegar a jorge.alferez.adan@gmail.com y a un panel centralizado que indique el origen.

## Decision
`/api/contact` guarda el lead como antes (ADR 0006) y después llama a `notificarLead`
(`src/lib/leads-notify.ts`), que en paralelo y con 8 s de límite:
1. envía un correo por Resend (`RESEND_API_KEY` u `OBRAS_RESEND_API_KEY`) a `LEADS_NOTIFY_EMAIL`
   (por omisión el buzón central), con web, origen, rol, servicio y zona en el asunto y `reply_to` del cliente;
2. hace POST JSON a `LEADS_HUB_URL` (`Bearer LEADS_HUB_TOKEN`) con `sitio`, `source_domain`, `origen`,
   `lead_id` y los datos del contacto.
Sin configuración cada canal se omite; un fallo nunca pierde el lead ni cambia la respuesta al usuario.

## Alternativas consideradas
| Alternativa | Por que no |
|---|---|
| Módulo LocalServiceLeads del hub como panel | No disponible en el plan actual del hub (comprobado 2026-11-03) |
| Panel propio dentro de esta web | No centraliza las demás webs |

## Consecuencias
El correo funciona en cuanto Railway tenga `RESEND_API_KEY`. El panel central se activa al definir
`LEADS_HUB_URL`/`LEADS_HUB_TOKEN`. El cuerpo es genérico (`source_domain`, `name`, `email`, `phone`, `consent_rgpd`):
compatible con el alta de leads del hub. Los datos personales viajan por HTTPS al buzón y al panel del propio titular.

## Verificacion
`npm run test:leads-notify` (11 aserciones: buzón por omisión, origen en asunto, HTML escapado, carga
con origen, fallos contenidos). Envío real: NO VERIFICADO hasta configurar las variables en Railway.
