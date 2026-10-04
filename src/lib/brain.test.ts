/**
 * Tests unitarios del cliente de Brain. Sin framework (mismo estilo que
 * src/lib/cte/index.test.ts): ejecuta con `npm run test:brain`.
 *
 *   - sin BRAIN_URL/BRAIN_TOKEN no hace ninguna petición;
 *   - con `fetch` inyectado envía el cuerpo del contrato a /api/ia/ejecuciones;
 *   - un fallo de red o un 5xx no lanzan y no filtran el token;
 *   - el wrapper de IA traduce una llamada a la ejecución que Brain espera.
 */

import { brainConfigured, reportToBrain, type BrainRun } from './brain';
import { brainRunFor } from './ai/client';

let failures = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log('  ✔', msg);
  } else {
    failures++;
    console.error('  ✘', msg);
  }
}

type Call = { url: string; init: RequestInit };

function fakeFetch(
  respond: (call: Call) => Response | Promise<Response>,
): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call = { url: String(input), init: init ?? {} };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  return { fetch: f, calls };
}

function captureWarn(): { messages: string[]; restore: () => void } {
  const messages: string[] = [];
  const orig = console.warn;
  console.warn = (...args: unknown[]) => {
    messages.push(args.map(String).join(' '));
  };
  return { messages, restore: () => (console.warn = orig) };
}

const TOKEN = 'sb_token_secreto_que_no_debe_salir';
const run: BrainRun = {
  automatizacion: 'intake',
  tipo: 'agente',
  proveedor: 'anthropic',
  modelo: 'claude-opus-4-7',
  estado: 'ok',
  duracion_ms: 1234,
  tokens_entrada: 100,
  tokens_salida: 50,
  coste_usd: 0.00175,
};

async function main() {
  console.log('\n— sin variables: no hace nada —');
  {
    const ff = fakeFetch(() => new Response('{}', { status: 202 }));
    const sent = await reportToBrain(run, { fetch: ff.fetch, env: {} });
    assert(sent === false, 'devuelve false sin BRAIN_URL/BRAIN_TOKEN');
    assert(ff.calls.length === 0, 'no llama a fetch sin variables');
    const soloUrl = await reportToBrain(run, { fetch: ff.fetch, env: { BRAIN_URL: 'https://b' } });
    assert(soloUrl === false && ff.calls.length === 0, 'tampoco con BRAIN_URL pero sin BRAIN_TOKEN');
    assert(brainConfigured({}) === false, 'brainConfigured({}) es false');
    assert(brainConfigured({ BRAIN_URL: 'https://b', BRAIN_TOKEN: 'x' }) === true, 'brainConfigured con ambas es true');
  }

  console.log('\n— con variables: envía el contrato —');
  {
    const ff = fakeFetch(() => new Response('{"ok":true,"recibidas":1}', { status: 202 }));
    const sent = await reportToBrain(run, {
      fetch: ff.fetch,
      env: { BRAIN_URL: 'https://brain.example.test/', BRAIN_TOKEN: TOKEN },
    });
    assert(sent === true, 'devuelve true con 202');
    assert(ff.calls.length === 1, 'una sola petición');
    const call = ff.calls[0];
    assert(call.url === 'https://brain.example.test/api/ia/ejecuciones', `URL del contrato sin doble barra (${call.url})`);
    assert(call.init.method === 'POST', 'método POST');
    const headers = call.init.headers as Record<string, string>;
    assert(headers.Authorization === `Bearer ${TOKEN}`, 'cabecera Authorization: Bearer <token>');
    assert(headers['Content-Type'] === 'application/json', 'Content-Type JSON');
    assert(call.init.signal instanceof AbortSignal, 'lleva señal de timeout');
    const body = JSON.parse(String(call.init.body));
    assert(body.automatizacion === 'intake', 'cuerpo: automatizacion');
    assert(body.tipo === 'agente' && body.proveedor === 'anthropic' && body.modelo === 'claude-opus-4-7', 'cuerpo: tipo, proveedor, modelo');
    assert(body.estado === 'ok' && body.duracion_ms === 1234, 'cuerpo: estado y duracion_ms');
    assert(body.tokens_entrada === 100 && body.tokens_salida === 50 && body.coste_usd === 0.00175, 'cuerpo: tokens y coste_usd');
    assert(!('error' in body) && !('resumen' in body), 'no envía claves undefined');
  }

  console.log('\n— errores tragados, token nunca registrado —');
  {
    const warn = captureWarn();
    try {
      const ffErr = fakeFetch(() => {
        throw new Error(`ECONNREFUSED al conectar con Bearer ${TOKEN}`);
      });
      const sent = await reportToBrain(run, {
        fetch: ffErr.fetch,
        env: { BRAIN_URL: 'https://brain.example.test', BRAIN_TOKEN: TOKEN },
      });
      assert(sent === false, 'fallo de red: devuelve false sin lanzar');

      const ff500 = fakeFetch(() => new Response('boom', { status: 500 }));
      const sent500 = await reportToBrain(run, {
        fetch: ff500.fetch,
        env: { BRAIN_URL: 'https://brain.example.test', BRAIN_TOKEN: TOKEN },
      });
      assert(sent500 === false, 'respuesta 500: devuelve false sin lanzar');

      const largo = await reportToBrain(
        { ...run, estado: 'error', error: 'x'.repeat(5000) },
        { fetch: fakeFetch(() => new Response('', { status: 202 })).fetch, env: { BRAIN_URL: 'https://b', BRAIN_TOKEN: TOKEN } },
      );
      assert(largo === true, 'un error largo se recorta y se envía igual');
    } finally {
      warn.restore();
    }
    assert(warn.messages.length === 2, `un warn por fallo (${warn.messages.length})`);
    // El mensaje del error de red contenía el token a propósito: el cliente lo reescribe sin él.
    assert(warn.messages.every((m) => !m.includes(TOKEN)), 'ningún warn contiene el token');
  }

  console.log('\n— brainRunFor: del wrapper de IA al contrato —');
  {
    const base = brainRunFor(
      { system: '', messages: [], brain: { automatizacion: 'chat-normativa', tipo: 'asistente', url: 'https://x/obras/1' } },
      'claude-sonnet-4-6',
    );
    assert(base.automatizacion === 'chat-normativa' && base.tipo === 'asistente', 'respeta automatizacion y tipo del llamador');
    assert(base.proveedor === 'anthropic' && base.modelo === 'claude-sonnet-4-6', 'añade proveedor y modelo');
    assert(base.url === 'https://x/obras/1', 'conserva la url del asistente');
    const porDefecto = brainRunFor({ system: '', messages: [] }, 'claude-opus-4-7');
    assert(porDefecto.automatizacion === 'obras-ia' && porDefecto.tipo === 'tarea', 'sin meta: identificador por defecto obras-ia/tarea');
  }

  console.log(`\n${failures === 0 ? '✓ Todos los tests OK' : `✘ ${failures} fallos`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
