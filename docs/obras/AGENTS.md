# Cómo escribir un nuevo agente — Simvix Obras

Un agente es una unidad de IA especializada que sirve a una fase concreta del
workflow. Esta guía cubre los patrones del paquete **P04** (prompt caching,
streaming, effort, selección dinámica de modelo, redacción PII).

## 1. Anatomía de un agente

Implementa la interfaz `Agent` en `src/lib/ai/agents/base.ts`:

```ts
interface Agent {
  name: string;                       // único; usado en BD y logs
  phase: PhaseType;                   // fase a la que sirve
  label: string;                      // título legible
  emitsDocument?: DocumentType;       // documento materializado
  preferredModel?: string;            // claude-opus-4-7 (default) / sonnet / haiku
  preferredEffort?: 'low'|'medium'|'high'|'xhigh'|'max';
  cachedPriorTypes?: DocumentType[];  // documentos previos a cachear
  systemPrompt: (ctx) => string;
  buildMessages: (ctx) => [...];
  postProcess?: (ctx, raw) => AgentResult;
}
```

## 2. Selección de modelo

| Tarea | Modelo | Effort | ¿Por qué? |
|---|---|---|---|
| Razonamiento normativo, memoria técnica, presupuesto | `claude-opus-4-7` | `high`/`xhigh` | Calidad crítica; el coste se amortiza con caché |
| Listados estructurados, rellenado de plantillas | `claude-sonnet-4-6` | `medium` | ~5× más barato; suficiente |
| Clasificación, validación, semantic match | `claude-haiku-4-5` | `low` | Más barato y rápido todavía |

Cuando dudes, empieza con `claude-opus-4-7` + `effort: 'high'`. Mide. Si la
fase es mecánica, baja a Sonnet.

> ⚠️ **Opus 4.7 elimina `temperature`, `top_p`, `top_k` y `budget_tokens`** — el
> cliente ya los omite. Usar adaptive thinking (automático) + el parámetro
> `effort` para regular la profundidad de razonamiento.

## 3. Prompt caching

El sistema cachea automáticamente:
- El **system prompt** (cache_control en el último bloque).
- Hasta **3 documentos previos** marcados en `cachedPriorTypes` (cada uno
  como un bloque user independiente, en el primer turno).

Para una fase como `presupuesto`, que reusa `MEDICIONES` y `MEMORIA_DESCRIPTIVA`,
declarar:

```ts
cachedPriorTypes: ['MEDICIONES', 'MEMORIA_DESCRIPTIVA'],
```

Reglas de caché (ver `shared/prompt-caching.md` de la skill de Anthropic):

- Cualquier byte que cambie en el prefijo invalida todo lo siguiente. **No
  pongas `Date.now()` ni el `userInput` antes del último breakpoint cacheado**.
- El mínimo cacheable es ~1024 tokens (Sonnet) / ~4096 (Opus). Por debajo
  Claude lo ignora silenciosamente.
- Verifica el efecto: `usage.cache_read_input_tokens > 0` en las llamadas
  siguientes a la misma fase.

## 4. Redacción de PII

Antes de enviar al modelo, el orquestador aplica `redactPII()` sobre:

- `ctx.userInput`
- Cada string en `ctx.prior`

Patrones detectados: DNI/NIE/CIF/IBAN/teléfono/email/tarjeta de crédito. Se
reemplazan por placeholders deterministas (`[DNI_1]`, `[EMAIL_2]`, ...). Tu
agente recibe los datos pseudonimizados y puede razonar sobre ellos sin
exponer datos personales.

Desactivar (no recomendado en prod): `OBRAS_REDACT_PII_BEFORE_AI=false`.

## 5. Streaming

Para conversaciones libres (chat con la fase actual), el endpoint
`POST /api/obras/[id]/chat` usa `callAiStream()` y SSE. El cliente React
(`useChat` + `<Chat />`) consume los eventos `delta` y muestra el texto
incrementalmente. Soporta cancelación vía `AbortController`.

Para producir el documento de una fase, `runPhase()` usa `callAi()` (también
streaming internamente vía `.stream().finalMessage()`).

## 6. Manejo de `stop_reason`

El cliente captura `stop_reason` y `stop_details`:

- `end_turn` → todo OK.
- `refusal` → el modelo rehúsa por seguridad. `AgentResult.ok = false` y
  `result.refusal.{category, explanation}` se rellenan. La UI lo muestra.
- `max_tokens` → output truncado; sube `maxTokens` o pide al modelo continuar
  con un nuevo turn.
- `pause_turn` → server-side tool loop interrumpido; reenviar y el servidor
  reanuda. (No implementado todavía aquí porque no usamos server tools.)

## 7. Coste y auditoría

Cada ejecución crea un `TaskRun` con: tokens (input + output + cache_read +
cache_creation), `costUsd` estimado, `model`, `durationMs`. El total se
acumula en `Project.aiCostUsd` y en `Organization.aiCostUsdTotal`.

El coste con caché es ~0.1× del precio base para los tokens cacheados — el
ROI de declarar bien `cachedPriorTypes` es enorme.

## 8. Plantillas de prompt versionadas

`PromptTemplate` + `PromptTemplateVersion` permiten:

- Almacenar el system prompt fuera del código (BD).
- Versionar cambios con autor y notas.
- Marcar una versión como `activeVersion`.
- Acumular métricas (`thumbsUp/Down`, `avgCostUsd`) por versión para A/B.

Hoy los prompts viven en el código de cada agente; migrar a plantillas
persistidas es la evolución natural en P04-bis (canary 10% → 100%).

## 9. Tests de coste

Para evitar regresiones en token spend, recomendado: añadir un test que
ejecute el agente sobre un fixture determinista (`seed-demo`) y verifique
que el coste estimado por fase está por debajo de un techo.

```ts
const result = await runPhase(p.id, 'MEMORIA_TECNICA');
expect(result.usage.inputTokens).toBeLessThan(8_000);
expect(result.usage.costUsd).toBeLessThan(0.3);
```

(Suite de tests pendiente hasta P03-bis.)

## 10. Checklist de PR

Al añadir/modificar un agente:

- [ ] `preferredModel` y `preferredEffort` declarados explícitamente.
- [ ] `cachedPriorTypes` con docs previos invariantes.
- [ ] System prompt sin volátiles (timestamps, IDs aleatorios).
- [ ] PII no expuesta accidentalmente en el prompt.
- [ ] Smoke-test pasa en modo mock.
- [ ] Si emite documento, `emitsDocument` declarado.
- [ ] Si la salida es JSON, usar `tryExtractJson()` en `postProcess`.
