'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/**
 * Campo de referencia catastral con botón "Consultar Catastro" que rellena
 * automáticamente los inputs de dirección/ciudad/provincia/CP/superficie del
 * mismo formulario (por `name`) si están vacíos. Útil en /obras/nuevo y en
 * la edición de un proyecto.
 */
export function CadastralLookupField({
  defaultValue,
  formId,
}: {
  defaultValue?: string;
  formId?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filled, setFilled] = useState<string[]>([]);

  async function onLookup() {
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/catastro/${encodeURIComponent(value.trim())}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const body = await res.json();
      const r = body.record as {
        addressLine?: string;
        city?: string;
        province?: string;
        postalCode?: string;
        useType?: string;
        surfaceM2?: number;
      };
      // Buscamos el form que contiene este componente.
      const form =
        (formId ? document.getElementById(formId) : null) ??
        (document.activeElement as HTMLElement | null)?.closest('form') ??
        document.querySelector('form');
      if (!form) return;
      const updated: string[] = [];
      const setIfEmpty = (name: string, val: string | number | undefined) => {
        if (val == null) return;
        const el = form.querySelector<HTMLInputElement>(`[name="${name}"]`);
        if (el && !el.value) {
          el.value = String(val);
          updated.push(name);
        }
      };
      setIfEmpty('addressLine', r.addressLine);
      setIfEmpty('city', r.city);
      setIfEmpty('province', r.province);
      setIfEmpty('postalCode', r.postalCode);
      setIfEmpty('surfaceM2', r.surfaceM2);
      setFilled(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sm:col-span-2">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            name="cadastralId"
            label="Ref. catastral"
            placeholder="20 caracteres alfanuméricos"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            hint={filled.length > 0 ? `Rellenado: ${filled.join(', ')}` : undefined}
          />
        </div>
        <Button type="button" size="sm" onClick={onLookup} loading={busy} variant="secondary">
          Consultar Catastro
        </Button>
      </div>
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  );
}
