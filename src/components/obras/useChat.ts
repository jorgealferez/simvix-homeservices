'use client';

import { useCallback, useRef, useState } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pending?: boolean;
}

export interface ChatUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  costUsd: number;
  stopReason: string | null;
  mocked: boolean;
}

/**
 * Hook para conversar con el agente IA de una fase del proyecto vía SSE.
 *
 *   - El servidor stream-ea tokens al cliente token a token.
 *   - Cancelable: `cancel()` aborta la conexión y persiste lo recibido hasta
 *     el momento (el endpoint lo gestiona en su lado).
 *   - El mensaje del usuario se persiste en BD al enviar; el del assistant al
 *     finalizar el stream.
 */
export function useChat(projectId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUsage, setLastUsage] = useState<ChatUsage | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const handleEvent = useCallback(
    (event: string, payload: Record<string, unknown>, asstId: string) => {
      if (event === 'delta') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === asstId ? { ...m, content: m.content + String(payload.text ?? '') } : m,
          ),
        );
      } else if (event === 'done') {
        setMessages((prev) =>
          prev.map((m) => (m.id === asstId ? { ...m, pending: false } : m)),
        );
        if (payload.usage) setLastUsage(payload.usage as ChatUsage);
      } else if (event === 'error') {
        setError(String(payload.message ?? 'Error en el stream'));
        setMessages((prev) =>
          prev.map((m) => (m.id === asstId ? { ...m, pending: false } : m)),
        );
      }
    },
    [],
  );

  const send = useCallback(
    async (message: string, phase?: string) => {
      const userId = `u-${Date.now()}`;
      const asstId = `a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: userId, role: 'user', content: message },
        { id: asstId, role: 'assistant', content: '', pending: true },
      ]);
      setError(null);
      setStreaming(true);

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch(`/api/obras/${projectId}/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ message, phase }),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error ?? `Error ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parsear eventos SSE acumulados
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            const lines = part.split('\n');
            let event = 'message';
            let data = '';
            for (const line of lines) {
              if (line.startsWith('event:')) event = line.slice(6).trim();
              else if (line.startsWith('data:')) data += line.slice(5).trim();
            }
            if (!data) continue;
            const payload = JSON.parse(data);
            handleEvent(event, payload, asstId);
          }
        }
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          setError(err instanceof Error ? err.message : String(err));
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === asstId ? { ...m, pending: false } : m)),
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [projectId, handleEvent],
  );

  return { messages, streaming, error, lastUsage, send, cancel };
}
