# Política de datos personales y retención — Simvix Obras

> Versión: 2026-05-16. Cubre el módulo `/obras`. Para la web pública de
> servicios del hogar la política operativa es independiente.

## 1. Datos personales tratados

| Categoría | Campos | Base legal | Origen |
|---|---|---|---|
| Identificación cliente | `Client.fullName`, `Client.email`, `Client.dni` | Ejecución de contrato (RGPD 6.1.b) | Formulario de alta |
| Contacto | `Client.phone`, `Client.address` | Ejecución de contrato | Formulario de alta |
| Localización del inmueble | `Project.addressLine`, `Project.cadastralId` | Ejecución de contrato | Formulario de alta / Catastro |
| Conversaciones con IA | `Conversation.content`, `TaskRun.input/output` | Interés legítimo (mejora servicio) | Sesión del usuario |
| Trazabilidad | `ProjectEvent`, `ProjectAudit` | Obligación legal (auditoría profesional) | Generado por la app |

## 2. Encriptación en reposo

`Client.phone`, `Client.dni` y `Client.address` se almacenan cifrados con
**AES-256-GCM**. Formato: `enc:v1:<base64(iv|authTag|cipher)>`.

La clave maestra se toma de `OBRAS_FIELD_KEY` (32 bytes en base64). En
producción **debe** configurarse explícitamente o el servidor rehúsa arrancar
(ver `assertProductionCryptoReady` en `src/lib/security/crypto.ts`).

La rotación se hará re-encriptando con un script de migración (versionado en
el prefijo: `enc:v2:`) cuando sea necesario.

## 3. Retención

| Recurso | Retención mínima | Retención máxima | Mecanismo |
|---|---|---|---|
| `Project` (vivo) | mientras dure la relación | n/a | manual |
| `Project` (`SOFT_DELETED`) | 30 días | 6 meses | housekeeping cron |
| `Submission` | 5 años (justificación admin.) | 10 años | manual + housekeeping |
| `TaskRun` exitoso | 90 días | 90 días | housekeeping cron |
| `TaskRun` fallido | 1 año | 1 año | housekeeping cron |
| `ProjectEvent` informativo | 180 días | 180 días | housekeeping cron |
| `ProjectEvent` crítico (CREATE/SUBMITTED/SOFT_DELETED/RESTORED) | 5 años | 5 años | preservado |
| `Conversation` | 12 meses | 12 meses | housekeeping cron (futuro) |
| `Document` | mientras dure el proyecto + 5 años post-cierre | 10 años | manual |

El cron de housekeeping (`prisma/scripts/housekeeping.ts`) se ejecuta a diario
y aplica esas reglas. Las purgas se documentan en `ProjectEvent` cuando
corresponden a un proyecto concreto.

## 4. Derechos del interesado (RGPD)

Endpoints planeados en P02 (cuando llegue auth):

- `GET /api/me/export` — exportación de datos (JSON + PDFs).
- `DELETE /api/me` — derecho al olvido (soft-delete + anonimización con
  hash determinista del email para preservar referencias en facturación).
- `PATCH /api/me` — rectificación de campos.

Hasta entonces, las solicitudes se procesan manualmente sobre la BD.

## 5. Subencargos

Servicios externos a los que se envían datos personales:

- **Anthropic Claude API**: contenido del proyecto (sin DNI/teléfono/dirección
  encriptados en claro al modelo; los agentes reciben el `INTAKE_BRIEF` y
  documentos derivados, donde la app evita exponer datos especialmente
  protegidos). Si se necesita compartir PII con el modelo, P04 incorporará
  anonimización previa.
- **Railway / Postgres managed**: alojamiento de la BD. Cifrado at-rest a
  nivel de proveedor.
- **Resend** (envío de email, opcional): nombre y email.

## 6. Brechas de seguridad

Plan operativo de respuesta:

1. **Detección**: alerta del log de errores Sentry / Datadog.
2. **Contención**: revocación de `OBRAS_FIELD_KEY` y `ANTHROPIC_API_KEY`.
3. **Erradicación**: rotación de claves, despliegue con re-encriptación
   masiva (P01.encrypt-existing-pii script soporta `enc:vN:`).
4. **Notificación**: a la AEPD en plazo de 72 h si afecta a datos personales,
   y a los interesados sin demora indebida.

## 7. Política de backups

- Diarios (Railway managed) con retención 30 días.
- Backups exportados a cold storage con retención 1 año (planificado en P01.5).
- Restore probado mensualmente (planificado).

## 8. Tránsito

- HTTPS obligatorio (forzado por Railway).
- Tokens internos firmados (P02).
- API tokens externos con scopes (P02.17).
