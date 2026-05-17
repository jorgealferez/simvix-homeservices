'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const SOURCES = [
  { value: 'PROPIO', label: 'Propio' },
  { value: 'CYPE', label: 'CYPE' },
  { value: 'BEDEC', label: 'BEDEC' },
  { value: 'OTRO', label: 'Otro' },
];

export function CatalogImportForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setOk(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      slug: String(fd.get('slug') ?? ''),
      name: String(fd.get('name') ?? ''),
      source: String(fd.get('source') ?? 'PROPIO'),
      year: fd.get('year') ? Number(fd.get('year')) : undefined,
      privateToOrg: fd.get('privateToOrg') === 'on',
      csv: String(fd.get('csv') ?? ''),
    };
    try {
      const res = await fetch('/api/catalogs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error ${res.status}`);
      }
      const body = await res.json();
      setOk(`Catálogo importado: ${body.itemsCount} ítems`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input name="slug" label="Slug" placeholder="cype-2026" pattern="[a-z0-9-]+" required />
        <Input name="name" label="Nombre" placeholder="CYPE 2026" required />
        <Select name="source" label="Fuente" options={SOURCES} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
        <Input name="year" type="number" label="Año" placeholder="2026" />
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="privateToOrg" />
          Privado a mi organización
        </label>
      </div>
      <Textarea
        name="csv"
        label="CSV"
        rows={8}
        placeholder={`chapter,code,description,unit,unitPrice\n01 Demoliciones,01.01,Demolición tabique,m2,18.5`}
        required
        full
      />
      {error && <div className="text-xs text-red-600">{error}</div>}
      {ok && <div className="text-xs text-emerald-700">{ok}</div>}
      <div className="flex justify-end">
        <Button type="submit" loading={submitting} size="sm">
          Importar
        </Button>
      </div>
    </form>
  );
}
