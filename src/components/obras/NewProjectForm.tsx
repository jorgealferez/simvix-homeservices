'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  ayuntamientos: { slug: string; nombre: string }[];
}

const OBRA_TYPES: { value: string; label: string }[] = [
  { value: 'REFORMA_INTERIOR', label: 'Reforma interior' },
  { value: 'REFORMA_INTEGRAL', label: 'Reforma integral' },
  { value: 'AMPLIACION', label: 'Ampliación' },
  { value: 'OBRA_NUEVA', label: 'Obra nueva' },
  { value: 'REHABILITACION', label: 'Rehabilitación' },
  { value: 'CAMBIO_USO', label: 'Cambio de uso' },
  { value: 'LEGALIZACION', label: 'Legalización' },
  { value: 'DEMOLICION', label: 'Demolición' },
];

const USE_TYPES: { value: string; label: string }[] = [
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
    <form onSubmit={onSubmit} className="space-y-6 bg-white border border-slate-200 rounded-lg p-6">
      <fieldset className="space-y-3">
        <legend className="font-semibold text-slate-800">Cliente</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field name="clientName" label="Nombre completo *" required />
          <Field name="clientEmail" type="email" label="Email *" required />
          <Field name="clientPhone" label="Teléfono" />
          <Field name="clientDni" label="DNI / NIE" />
          <Field name="clientAddress" label="Dirección particular" full />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-slate-800">Proyecto</legend>
        <Field name="title" label="Título del proyecto *" full required />
        <Field name="summary" label="Resumen breve" full multiline rows={2} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select name="obraType" label="Tipo de obra *" options={OBRA_TYPES} required />
          <Select name="useType" label="Uso *" options={USE_TYPES} required />
          <Field name="surfaceM2" type="number" label="Superficie (m²)" />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-slate-800">Emplazamiento</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field name="addressLine" label="Dirección" full />
          <Field name="city" label="Ciudad" />
          <Field name="province" label="Provincia" />
          <Field name="postalCode" label="CP" />
          <Field name="cadastralId" label="Ref. catastral" full />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-slate-800">Tramitación</legend>
        <Select
          name="ayuntamientoSlug"
          label="Ayuntamiento destino"
          options={ayuntamientos.map((a) => ({ value: a.slug, label: a.nombre }))}
        />
        <Field
          name="intakeMessage"
          label="Mensaje inicial del cliente (lo verá el agente de intake)"
          full
          multiline
          rows={4}
        />
      </fieldset>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-300 text-slate-900 font-medium px-5 py-2 rounded-md"
        >
          {submitting ? 'Creando…' : 'Crear proyecto'}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required = false,
  full = false,
  multiline = false,
  rows = 3,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  full?: boolean;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className={`block text-sm ${full ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
      <span className="text-slate-700">{label}</span>
      {multiline ? (
        <textarea
          name={name}
          rows={rows}
          required={required}
          className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      )}
    </label>
  );
}

function Select({
  name,
  label,
  options,
  required = false,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-700">{label}</span>
      <select
        name={name}
        required={required}
        defaultValue={options[0]?.value}
        className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
