'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CadastralLookupField } from './CadastralLookupField';

interface Props {
  ayuntamientos: { slug: string; nombre: string }[];
}

const OBRA_TYPES = [
  { value: 'REFORMA_INTERIOR', label: 'Reforma interior' },
  { value: 'REFORMA_INTEGRAL', label: 'Reforma integral' },
  { value: 'AMPLIACION', label: 'Ampliación' },
  { value: 'OBRA_NUEVA', label: 'Obra nueva' },
  { value: 'REHABILITACION', label: 'Rehabilitación' },
  { value: 'CAMBIO_USO', label: 'Cambio de uso' },
  { value: 'LEGALIZACION', label: 'Legalización' },
  { value: 'DEMOLICION', label: 'Demolición' },
];

const USE_TYPES = [
  { value: 'VIVIENDA', label: 'Vivienda' },
  { value: 'LOCAL_COMERCIAL', label: 'Local comercial' },
  { value: 'OFICINA', label: 'Oficina' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
  { value: 'HOSTELERIA', label: 'Hostelería' },
  { value: 'GARAJE', label: 'Garaje' },
  { value: 'TRASTERO', label: 'Trastero' },
  { value: 'OTROS', label: 'Otros' },
];

export function NewProjectForm({ ayuntamientos }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      client: {
        fullName: String(fd.get('clientName') ?? ''),
        email: String(fd.get('clientEmail') ?? ''),
        phone: String(fd.get('clientPhone') ?? '') || undefined,
        dni: String(fd.get('clientDni') ?? '') || undefined,
        address: String(fd.get('clientAddress') ?? '') || undefined,
      },
      project: {
        title: String(fd.get('title') ?? ''),
        summary: String(fd.get('summary') ?? '') || undefined,
        addressLine: String(fd.get('addressLine') ?? '') || undefined,
        city: String(fd.get('city') ?? '') || undefined,
        province: String(fd.get('province') ?? '') || undefined,
        postalCode: String(fd.get('postalCode') ?? '') || undefined,
        cadastralId: String(fd.get('cadastralId') ?? '') || undefined,
        obraType: String(fd.get('obraType') ?? 'REFORMA_INTERIOR'),
        useType: String(fd.get('useType') ?? 'VIVIENDA'),
        surfaceM2: fd.get('surfaceM2') ? Number(fd.get('surfaceM2')) : undefined,
        ayuntamientoSlug: String(fd.get('ayuntamientoSlug') ?? 'generico'),
      },
      intakeMessage: String(fd.get('intakeMessage') ?? '') || undefined,
    };

    try {
      const res = await fetch('/api/obras', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const data = await res.json();
      router.push(`/obras/${data.project.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6"
    >
      <Fieldset legend="Cliente">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input name="clientName" label="Nombre completo *" required />
          <Input name="clientEmail" type="email" label="Email *" required />
          <Input name="clientPhone" label="Teléfono" />
          <Input name="clientDni" label="DNI / NIE" />
          <Input name="clientAddress" label="Dirección particular" full />
        </div>
      </Fieldset>

      <Fieldset legend="Proyecto">
        <Input name="title" label="Título del proyecto *" full required />
        <Textarea name="summary" label="Resumen breve" rows={2} full />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select name="obraType" label="Tipo de obra *" options={OBRA_TYPES} required />
          <Select name="useType" label="Uso *" options={USE_TYPES} required />
          <Input name="surfaceM2" type="number" step="0.01" label="Superficie (m²)" />
        </div>
      </Fieldset>

      <Fieldset legend="Emplazamiento">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CadastralLookupField />
          <Input name="addressLine" label="Dirección" full />
          <Input name="city" label="Ciudad" />
          <Input name="province" label="Provincia" />
          <Input name="postalCode" label="CP" />
        </div>
      </Fieldset>

      <Fieldset legend="Tramitación">
        <Select
          name="ayuntamientoSlug"
          label="Ayuntamiento destino"
          options={ayuntamientos.map((a) => ({ value: a.slug, label: a.nombre }))}
        />
        <Textarea
          name="intakeMessage"
          label="Mensaje inicial del cliente (lo verá el agente de intake)"
          rows={4}
          full
        />
      </Fieldset>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          {submitting ? 'Creando…' : 'Crear proyecto'}
        </Button>
      </div>
    </form>
  );
}

function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-semibold text-slate-800 dark:text-slate-200">{legend}</legend>
      {children}
    </fieldset>
  );
}
