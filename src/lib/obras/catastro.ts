import { prisma } from '@/lib/db';

/**
 * P10 — Catastro.
 *
 * La Sede Electrónica del Catastro (https://www.sedecatastro.gob.es) expone
 * un servicio OVCCallejero SOAP para consultas básicas y un servicio
 * autenticado para fichas completas. Aquí dejamos:
 *
 *   - validateCadastralRef(): valida el formato (20 caracteres alfanuméricos).
 *   - lookupCadastral(): si OBRAS_CATASTRO_PROVIDER=live, llama al SOAP; en
 *     'mock' (default) devuelve una ficha plausible derivada del propio ID.
 *   - autofillProjectFromCadastral(): rellena los campos del proyecto que
 *     todavía no están definidos (sin pisar lo que el usuario haya puesto).
 *
 * La integración real con certificado digital queda preparada — sólo hay que
 * sustituir `liveLookup` por el cliente SOAP real.
 */

export interface CadastralRecord {
  cadastralId: string;
  addressLine?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  useType?: string; // VIVIENDA, LOCAL_COMERCIAL, ...
  surfaceM2?: number;
  yearBuilt?: number;
  source: 'mock' | 'sede-catastro';
  retrievedAt: string;
}

const REF_REGEX = /^[A-Z0-9]{14}[A-Z0-9]{4}[A-Z0-9]{2}$/i; // 14 parcela + 4 finca + 2 control

export function validateCadastralRef(ref: string): boolean {
  if (!ref) return false;
  const cleaned = ref.replace(/[\s-]/g, '').toUpperCase();
  return cleaned.length === 20 && REF_REGEX.test(cleaned);
}

export function normalizeCadastralRef(ref: string): string {
  return ref.replace(/[\s-]/g, '').toUpperCase();
}

export async function lookupCadastral(ref: string): Promise<CadastralRecord> {
  const cleaned = normalizeCadastralRef(ref);
  if (!validateCadastralRef(cleaned)) {
    throw new Error('Referencia catastral inválida (deben ser 20 caracteres alfanuméricos)');
  }
  const provider = process.env.OBRAS_CATASTRO_PROVIDER ?? 'mock';
  if (provider === 'live') {
    return liveLookup(cleaned);
  }
  return mockLookup(cleaned);
}

async function liveLookup(_ref: string): Promise<CadastralRecord> {
  // Placeholder: aquí iría una llamada SOAP a
  // https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc
  throw new Error('Catastro live no configurado: define OBRAS_CATASTRO_PROVIDER=mock o implementa el cliente SOAP.');
}

function mockLookup(ref: string): CadastralRecord {
  // Derivamos campos plausibles del propio ref para que cada lookup sea
  // determinista. No es información real del catastro.
  const seed = ref
    .split('')
    .reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const surface = 60 + (seed % 140);
  const year = 1950 + (seed % 70);
  return {
    cadastralId: ref,
    addressLine: `C/ Demo nº ${(seed % 99) + 1}`,
    city: 'Madrid',
    province: 'Madrid',
    postalCode: `280${String(seed % 100).padStart(2, '0')}`,
    useType: 'VIVIENDA',
    surfaceM2: surface,
    yearBuilt: year,
    source: 'mock',
    retrievedAt: new Date().toISOString(),
  };
}

/**
 * Rellena campos del proyecto que estén vacíos a partir de un record
 * catastral. No pisa campos ya definidos por el usuario.
 */
export async function autofillProjectFromCadastral(projectId: string, record: CadastralRecord) {
  const p = await prisma.project.findUnique({ where: { id: projectId } });
  if (!p) throw new Error('Proyecto no encontrado');
  const updates: Record<string, string | number> = {};
  if (!p.addressLine && record.addressLine) updates.addressLine = record.addressLine;
  if (!p.city && record.city) updates.city = record.city;
  if (!p.province && record.province) updates.province = record.province;
  if (!p.postalCode && record.postalCode) updates.postalCode = record.postalCode;
  if (!p.cadastralId) updates.cadastralId = record.cadastralId;
  if (!p.surfaceM2 && record.surfaceM2) updates.surfaceM2 = record.surfaceM2;

  if (Object.keys(updates).length === 0) return { project: p, updatedFields: [] };

  const updated = await prisma.project.update({ where: { id: projectId }, data: updates });
  await prisma.projectEvent.create({
    data: {
      projectId,
      type: 'CADASTRAL_AUTOFILL',
      actor: 'system',
      payload: JSON.stringify({ fields: Object.keys(updates), source: record.source }),
    },
  });
  return { project: updated, updatedFields: Object.keys(updates) };
}
