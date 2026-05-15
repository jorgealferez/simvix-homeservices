import { NewProjectForm } from '@/components/obras/NewProjectForm';
import { listAyuntamientos } from '@/lib/obras/ayuntamientos';

export default function NuevoProyectoPage() {
  const ayuntamientos = listAyuntamientos();
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Nuevo proyecto de obra</h1>
      <p className="text-sm text-slate-600">
        Rellena los datos iniciales del cliente y del proyecto. La IA se encargará después de
        producir la normativa, anteproyecto, memoria técnica, mediciones, presupuesto, ESS,
        residuos y la documentación administrativa para presentar al ayuntamiento.
      </p>
      <NewProjectForm ayuntamientos={ayuntamientos.map((a) => ({ slug: a.slug, nombre: a.nombre }))} />
    </div>
  );
}
