'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const OBRA = [
  { value: 'REFORMA_INTERIOR', label: 'Reforma interior' },
  { value: 'REFORMA_INTEGRAL', label: 'Reforma integral' },
  { value: 'OBRA_NUEVA', label: 'Obra nueva' },
  { value: 'AMPLIACION', label: 'Ampliación' },
  { value: 'REHABILITACION', label: 'Rehabilitación' },
];
const USE = [
  { value: 'VIVIENDA', label: 'Vivienda' },
  { value: 'LOCAL_COMERCIAL', label: 'Local comercial' },
  { value: 'OFICINA', label: 'Oficina' },
  { value: 'HOSTELERIA', label: 'Hostelería' },
];
const ZONES = ['A', 'B', 'C', 'D', 'E'].map((z) => ({ value: z, label: `Zona ${z}` }));

export function CteCheckClient() {
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      obraType: String(fd.get('obraType')),
      useType: String(fd.get('useType')),
      surfaceM2: Number(fd.get('surfaceM2')),
      zone: fd.get('zone') ? String(fd.get('zone')) : undefined,
      envelope: fd.get('zone')
        ? {
            uMuros: Number(fd.get('uMuros') ?? 0.7),
            uHuecos: Number(fd.get('uHuecos') ?? 2.5),
            uCubierta: Number(fd.get('uCubierta') ?? 0.4),
            uSuelo: Number(fd.get('uSuelo') ?? 0.5),
          }
        : undefined,
      evacuation: fd.get('exitWidthCm')
        ? {
            exitWidthCm: Number(fd.get('exitWidthCm')),
            numExits: Number(fd.get('numExits') ?? 1),
          }
        : undefined,
      accessibility: {
        hasAccessibleItinerary: fd.get('hasAccessibleItinerary') === 'on',
        doorClearWidthCm: Number(fd.get('doorClearWidthCm') ?? 80),
        bathroomFreeDiameterCm: Number(fd.get('bathroomFreeDiameterCm') ?? 150),
      },
      fixtures: fd.get('fixtures') ? Number(fd.get('fixtures')) : undefined,
    };
    try {
      const res = await fetch('/api/cte/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select name="obraType" label="Tipo de obra" options={OBRA} required />
        <Select name="useType" label="Uso" options={USE} required />
        <Input name="surfaceM2" type="number" step="0.1" label="Superficie útil (m²)" required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        <Select name="zone" label="Zona climática (HE1)" options={[{ value: '', label: '—' }, ...ZONES]} />
        <Input name="uMuros" type="number" step="0.01" label="U muros" />
        <Input name="uHuecos" type="number" step="0.01" label="U huecos" />
        <Input name="uCubierta" type="number" step="0.01" label="U cubierta" />
        <Input name="uSuelo" type="number" step="0.01" label="U suelo" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input name="exitWidthCm" type="number" label="Ancho de salida (cm) — SI3" />
        <Input name="numExits" type="number" label="Nº salidas" defaultValue={1} />
        <Input name="fixtures" type="number" label="Nº grifos (HS4)" />
      </div>
      <fieldset className="border border-slate-200 dark:border-slate-700 rounded-md p-3">
        <legend className="text-xs uppercase text-slate-500 px-1">Accesibilidad (SUA9)</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="hasAccessibleItinerary" defaultChecked />
            Itinerario accesible
          </label>
          <Input name="doorClearWidthCm" type="number" label="Puerta libre (cm)" defaultValue={80} />
          <Input name="bathroomFreeDiameterCm" type="number" label="Aseo Ø (cm)" defaultValue={150} />
        </div>
      </fieldset>

      {error && <div className="text-xs text-red-600">{error}</div>}
      <div className="flex justify-end">
        <Button type="submit" loading={loading} size="sm">
          Comprobar
        </Button>
      </div>

      {result !== null && (
        <pre className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md p-3 text-xs font-mono max-h-96 overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </form>
  );
}
