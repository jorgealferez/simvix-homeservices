# ADR 0005 — /obras responde 404 mientras no tenga base de datos

- **Estado:** aceptado
- **Fecha:** 2026-11-03
- **Fase:** mantenimiento (incidencia de producción)
- **Decide:** Constructor, auditado por el Critico

## Contexto
Tras el ADR 0004, `GET /obras` seguía en 500: el módulo nunca se conectó a una base de datos en
producción (`schema.prisma` en SQLite, sin `DATABASE_URL`) y la carta deja fuera el producto /obras.
El bloqueo ofrecía dos opciones: activarlo (A) o apagarlo de forma controlada (B). Se aplica B.

## Decision
`obrasDisponible()` (`src/lib/obras/disponible.ts`) es `true` solo con `DATABASE_URL` no vacía, y el
layout de `/obras` llama a `notFound()` si es `false`: todo `/obras/*` responde 404 con la página de
la web.

## Alternativas consideradas
| Alternativa | Por que no |
|---|---|
| Página «próximamente» con 200 | Indexable y promete algo que la carta no contempla |
| Comprobarlo en el middleware | Corre en Edge; leer variables de entorno en tiempo de ejecución ahí no es fiable en `next start` |
| Borrar el módulo | Pierde código del roadmap de /obras; activarlo después es solo configurar la BD |

## Consecuencias
Sin 500 en /obras. Con `DATABASE_URL` el módulo vuelve a servirse sin tocar código, pero antes hay que
cambiar el `provider` a `postgresql`, migrar y poner `AUTH_TRUST_HOST=true` (opción A, pendiente de
decisión). Las APIs `/api/obras/*` ya responden 401 sin sesión, y sin base de datos no hay sesiones.

## Seguridad
1. **Identidad:** sin cambios. 2. **Autorizacion:** sin cambios; el 404 llega antes que cualquier
dato. 3. **Entrada:** ninguna nueva. 4. **Secretos y configuracion:** solo se mira si `DATABASE_URL`
existe, nunca su valor; si falta, el módulo queda cerrado. 5. **Datos personales:** ninguno.
6. **Frenos:** no aplica. 7. **Prueba:** `src/lib/obras/disponible.test.ts` (cinco casos y que el
layout siga aplicando la regla) y la comprobación con `next start` sin `DATABASE_URL`.

## Verificacion
`npm run test:obras-disponible` dentro de `npm test`; en producción, `GET /obras` responde 404.
