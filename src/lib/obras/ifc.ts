/**
 * P26 — BIM IFC (stub).
 *
 * Parse minimalista de un archivo IFC STEP plano. No es un viewer, no resuelve
 * geometría real (eso requiere web-ifc o IfcOpenShell). Sirve para:
 *   - Identificar el schema (IFC4, IFC2X3...).
 *   - Contar entidades por tipo (IfcWall, IfcSlab, IfcDoor, IfcWindow, IfcSpace).
 *   - Extraer una lista de IfcSpace con su nombre + área (cuando la BIM lo
 *     exporta como propiedad QtoArea).
 *
 * Para visualización 3D y mediciones reales, ver el roadmap de P26-bis donde
 * incorporamos web-ifc-three / ifc.js como artifact del lado cliente.
 */

export interface IfcSummary {
  schema: string;
  totalEntities: number;
  counts: Record<string, number>;
  spaces: { name: string; areaM2?: number }[];
}

const ENTITY_RE = /^#\d+\s*=\s*([A-Z][A-Z0-9]+)\b/;
const HEADER_RE = /FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'\s*\)\s*\)/i;

export function summarizeIfc(text: string): IfcSummary {
  const lines = text.split(/\r?\n/);
  const counts: Record<string, number> = {};
  let schema = 'unknown';
  const spaceNames: string[] = [];
  let totalEntities = 0;

  for (const line of lines) {
    const sch = HEADER_RE.exec(line);
    if (sch) schema = sch[1];
    const m = ENTITY_RE.exec(line.trim());
    if (m) {
      const type = m[1];
      counts[type] = (counts[type] ?? 0) + 1;
      totalEntities++;
      if (type === 'IFCSPACE') {
        const name = line.match(/'([^']+)'/);
        if (name) spaceNames.push(name[1]);
      }
    }
  }
  // IFCSPACE areas se anotan en IFCELEMENTQUANTITY/IFCQUANTITYAREA — el parser
  // ingenuo no las une. Las dejamos sin areaM2 (undefined).
  return {
    schema,
    totalEntities,
    counts,
    spaces: spaceNames.map((name) => ({ name })),
  };
}
