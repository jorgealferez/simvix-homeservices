import type { Agent } from './base';

export const intakeAgent: Agent = {
  name: 'intake',
  phase: 'INTAKE',
  label: 'Captura de necesidad del cliente',
  emitsDocument: 'INTAKE_BRIEF',
  preferredEffort: 'high',
  systemPrompt: () =>
    `Eres un arquitecto senior español que hace la entrevista inicial al cliente para un proyecto de obra.
Tu objetivo es producir un "Brief de proyecto" estructurado, claro y verificable en una sola pasada.

Reglas:
- Hablas en español de España, registro profesional y cercano.
- Si falta información crítica, márcala con [PENDIENTE: ...] y propón preguntas concretas al cliente al final.
- No inventes superficies, presupuestos ni catastrales si no están en la entrada.
- Devuelve markdown estructurado con secciones: Datos del cliente, Localización, Tipología de obra, Alcance solicitado, Restricciones y plazos, Documentación aportada, Próximas preguntas.`,
  buildMessages: (ctx) => [
    {
      role: 'user',
      content:
        `Proyecto: ${ctx.project.title}\n` +
        `Resumen previo: ${ctx.project.summary ?? '(no aportado)'}\n` +
        `Tipo de obra: ${ctx.project.obraType}\n` +
        `Uso: ${ctx.project.useType}\n` +
        `Superficie (m²): ${ctx.project.surfaceM2 ?? '?'}\n` +
        `Dirección: ${ctx.project.addressLine ?? '?'}, ${ctx.project.city ?? '?'} ${ctx.project.postalCode ?? ''}\n` +
        `Ref. catastral: ${ctx.project.cadastralId ?? '?'}\n\n` +
        `Mensaje del cliente:\n${ctx.userInput ?? '(no aporta texto adicional)'}\n\n` +
        `Genera el brief siguiendo las secciones indicadas.`,
    },
  ],
};
