'use client';

import { useState } from 'react';
import { useChat } from './useChat';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

interface Props {
  projectId: string;
  currentPhase: string;
}

export function Chat({ projectId, currentPhase }: Props) {
  const [draft, setDraft] = useState('');
  const { messages, streaming, error, lastUsage, send, cancel } = useChat(projectId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || streaming) return;
    setDraft('');
    await send(text, currentPhase);
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2 mb-3">
        <CardTitle>Chat con el agente {currentPhase}</CardTitle>
        <div className="flex items-center gap-2">
          {lastUsage?.cacheReadTokens ? (
            <Badge tone="success">
              cache hit · {lastUsage.cacheReadTokens.toLocaleString('es-ES')} tok
            </Badge>
          ) : null}
          {lastUsage ? (
            <Badge tone="neutral">
              ${lastUsage.costUsd.toFixed(4)}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="max-h-80 overflow-auto space-y-2 mb-3 text-sm">
        {messages.length === 0 && (
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Escribe un mensaje para iniciar una conversación con el agente IA de la fase
            actual. Las respuestas se streaman token a token.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === 'user'
                ? 'border-l-2 border-emerald-400 pl-3 text-slate-800 dark:text-slate-200'
                : 'border-l-2 border-blue-400 pl-3 text-slate-700 dark:text-slate-300'
            }
          >
            <div className="text-[10px] uppercase tracking-wide opacity-60 mb-0.5">
              {m.role}
              {m.pending && ' · escribiendo…'}
            </div>
            <div className="whitespace-pre-wrap font-mono text-xs">
              {m.content || (m.pending ? <span className="animate-pulse">▍</span> : '')}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="text-xs text-red-600 mb-2">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Pregunta algo sobre la fase actual del proyecto…"
          disabled={streaming}
        />
        <div className="flex gap-2 justify-end">
          {streaming && (
            <Button type="button" variant="ghost" size="sm" onClick={cancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" size="sm" loading={streaming} disabled={!draft.trim()}>
            Enviar
          </Button>
        </div>
      </form>
    </Card>
  );
}
