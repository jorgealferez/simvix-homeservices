# ADR 0004 — El middleware usa una configuración de Auth.js sin Prisma

- **Estado:** aceptado
- **Fecha:** 2026-11-02
- **Fase:** mantenimiento (incidencia de producción)
- **Decide:** Constructor, auditado por el Critico

## Contexto
En Railway, `GET /obras` respondía 500 siempre (4 respuestas en 24 h, todas en `/obras`). El log del
servicio decía `PrismaClient is not configured to run in Edge Runtime` dentro de
`.next/server/src/middleware.js`. El middleware de Next corre en Edge e importaba `auth` de
`@/lib/auth/config`, que arrastra `PrismaAdapter`, `@/lib/db` (Prisma) y `bcryptjs`. El mismo fallo
afecta a todo lo que el middleware protege: `/obras/*`, `/api/obras/*` y `/api/organizations/*`.

## Decision
Separar la configuración de Auth.js en dos: `src/lib/auth/edge.ts` (sesión JWT, página de acceso y el
callback `session`, sin base de datos) para el middleware, y `src/lib/auth/config.ts`, que la extiende
con el adaptador, las credenciales y el callback `jwt`, para las rutas de Node.

## Alternativas consideradas
| Alternativa | Por que no |
|---|---|
| `runtime = 'nodejs'` en el middleware | Depende de una opción experimental de Next 15; el patrón de dos configuraciones es el documentado por Auth.js v5 |
| Prisma Accelerate o adaptador de driver para Edge | Servicio o dependencia nueva para algo que el middleware no necesita: con JWT basta descifrar la cookie |
| Quitar el middleware y proteger cada página | Repite la comprobación en decenas de rutas y una que se olvide queda abierta |

## Consecuencias
Las rutas protegidas vuelven a responder (redirección a `/obras/login` sin sesión, la página con
sesión). El callback `session` vive en un solo sitio y lo usan las dos configuraciones, así que el
contenido de `req.auth` y de `auth()` no diverge.

## Seguridad
1. **Identidad:** quien llama se identifica por la cookie JWT de Auth.js; el middleware la descifra
   con el mismo `AUTH_SECRET` que la emite. No cambia cómo se emite (credenciales, en Node).
2. **Autorizacion:** sin cambios: sin sesión, las APIs dan 401 y la UI redirige al acceso; los roles
   se siguen comprobando en cada ruta con `rbac.ts`.
3. **Entrada:** el middleware solo lee la ruta y la cookie; no hay entrada nueva.
4. **Secretos y configuracion:** `AUTH_SECRET` igual que antes. Si falta, Auth.js no descifra la
   cookie y trata la petición como sin sesión: falla cerrado.
5. **Datos personales:** `req.auth` lleva id, memberships y org activa del JWT; no se registra.
6. **Frenos:** el bloqueo por intentos fallidos sigue en `authorize`, en Node, sin cambios.
7. **Prueba:** `src/middleware.test.ts` recorre el grafo de imports del middleware y falla si llega a
   Prisma, al adaptador, a `bcrypt*`, `argon2` o `node:*`; contra el código anterior da rojo con los
   tres módulos culpables.

## Verificacion
`npm run test:middleware` (dentro de `npm test`, puerta `node:test`) y `npm run build`. En producción,
tasa de 5xx de `simvix-homeservices` en Railway a 0 en `/obras` tras el despliegue.
