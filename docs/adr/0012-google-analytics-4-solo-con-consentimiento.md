# ADR 0012 — Google Analytics 4 solo con consentimiento previo y el ID por variable de entorno

- **Estado:** aceptado
- **Fecha:** 2026-11-17
- **Referencia cruzada:** simvix-brain Fase 30 (C28, ADR 0029 de ese repositorio)

## Contexto
El usuario pide Google Analytics en todas las webs desplegadas, en la parte publica y la privada, y
un panel por proyecto en Simvix Brain. Esta web no tenia analitica (solo un `NEXT_PUBLIC_GA_ID`
comentado en `.env.example`, sin uso).

## Decision
- `public/simvix-analitica.js` es el script canonico del grupo (identico en todas las aplicaciones):
  sin un ID `G-` valido no hace nada; con el, enseña un aviso con «Rechazar» y «Aceptar» al mismo
  nivel y solo tras «Aceptar» carga gtag.js con la IP anonimizada y la publicidad denegada.
- El layout raiz (`src/app/layout.tsx`) lo incluye para toda la web, la publica y el portal, solo si
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` o `GA_MEASUREMENT_ID` traen un ID valido (`src/lib/analitica.ts`).
  Brain escribe las dos variables en el servicio de Railway desde `/analitica`.
- La politica de privacidad lo explica y enlaza «preferencias de analitica» para cambiar la decision.

## Alternativas
- `@next/third-parties` con GA siempre cargado: envia datos antes del consentimiento (LSSI 22.2).
- Un banner de un proveedor externo: otra dependencia y otra cookie para lo mismo.

## Seguridad
- Lo unico que entra es el ID, validado con `^G-[A-Z0-9]{4,20}$` antes de pintarse; React lo escapa.
- No toca secretos ni sesiones. Sin variable, nada cambia (cerrado). Ningun dato personal se envia a
  Google sin aceptacion; el aviso no escribe nada hasta que se elige.
- Prueba: `npm run test:analitica` (ID, script y layout).
