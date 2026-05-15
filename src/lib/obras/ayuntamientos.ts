/**
 * Configuración por ayuntamiento. Cada entrada agrupa la información mínima
 * que necesitan los agentes de "doc-administrativa" y "ayuntamiento":
 *
 *  - Régimen telemático preferente (sede electrónica).
 *  - Modelos / formularios típicos.
 *  - Cálculo orientativo de ICIO (% sobre PEM) y tasas.
 *  - Particularidades de tramitación.
 *
 * Para no incurrir en información incorrecta, los porcentajes y URLs son
 * orientativos. En cada nuevo despliegue el cliente debe verificar contra la
 * ordenanza vigente.
 */

export interface AyuntamientoConfig {
  slug: string;
  nombre: string;
  provincia: string;
  comunidad: string;
  sedeElectronica?: string;
  // ICIO (% sobre PEM). Rango típico 2-4% en municipios > 50.000 hab.
  icioPct: number;
  // Tasa fija orientativa (€) o porcentaje adicional sobre PEM.
  tasaLicenciaPct: number;
  // Modelos a incluir en el paquete (etiquetas, los rellena el agente).
  modelosTipicos: string[];
  notas?: string;
}

export const AYUNTAMIENTOS: AyuntamientoConfig[] = [
  {
    slug: 'generico',
    nombre: 'Ayuntamiento (genérico)',
    provincia: '',
    comunidad: '',
    icioPct: 3.5,
    tasaLicenciaPct: 1.0,
    modelosTipicos: [
      'Solicitud de licencia / declaración responsable',
      'Justificación de pago de tasas e ICIO',
      'Autorización del propietario (si aplica)',
      'Hoja de encargo del técnico redactor',
      'Estudio básico de seguridad y salud',
      'Estudio de gestión de residuos',
      'Memoria técnica',
      'Presupuesto',
      'Planos',
    ],
    notas: 'Plantilla por defecto cuando no hay configuración específica del municipio.',
  },
  {
    slug: 'madrid',
    nombre: 'Ayuntamiento de Madrid',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    sedeElectronica: 'https://sede.madrid.es',
    icioPct: 4.0,
    tasaLicenciaPct: 1.5,
    modelosTipicos: [
      'Solicitud de licencia urbanística',
      'Declaración responsable de obras',
      'Comunicación previa de obras',
      'Modelo ICIO 2026',
      'Autoliquidación tasa licencia',
      'Anexo CTE-DB-HE eficiencia energética',
    ],
    notas:
      'Madrid distingue obras según ZPHA (Zona de Protección del Patrimonio Histórico-Artístico). Verificar protección catastral antes de elegir régimen.',
  },
  {
    slug: 'barcelona',
    nombre: 'Ajuntament de Barcelona',
    provincia: 'Barcelona',
    comunidad: 'Catalunya',
    sedeElectronica: 'https://seuelectronica.ajuntament.barcelona.cat',
    icioPct: 4.0,
    tasaLicenciaPct: 2.0,
    modelosTipicos: [
      'Comunicat d’obres',
      'Llicència d’obres majors / menors',
      'Justificant tasa i ICIO',
      'Estudi bàsic SS',
      'Estudi gestió residus',
    ],
    notas:
      'Documentación admisible bilingüe (catalán/castellano). Régimen de comunicación inmediata para obras menores con condiciones estrictas.',
  },
  {
    slug: 'valencia',
    nombre: 'Ajuntament de València',
    provincia: 'Valencia',
    comunidad: 'Comunitat Valenciana',
    sedeElectronica: 'https://sede.valencia.es',
    icioPct: 3.5,
    tasaLicenciaPct: 1.2,
    modelosTipicos: [
      'Declaració responsable d’obres',
      'Llicència urbanística',
      'Justificant ICIO',
      'Justificant tassa',
    ],
  },
  {
    slug: 'sevilla',
    nombre: 'Ayuntamiento de Sevilla',
    provincia: 'Sevilla',
    comunidad: 'Andalucía',
    sedeElectronica: 'https://sede.sevilla.org',
    icioPct: 3.0,
    tasaLicenciaPct: 1.0,
    modelosTipicos: [
      'Solicitud de licencia de obras',
      'Declaración responsable',
      'Modelo ICIO',
      'Tasa licencia urbanística',
    ],
  },
];

export function getAyuntamiento(slug: string | null | undefined): AyuntamientoConfig {
  if (!slug) return AYUNTAMIENTOS[0];
  const found = AYUNTAMIENTOS.find((a) => a.slug === slug);
  return found ?? AYUNTAMIENTOS[0];
}

export function listAyuntamientos(): AyuntamientoConfig[] {
  const enabled = (process.env.OBRAS_AYUNTAMIENTOS_HABILITADOS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!enabled.length) return AYUNTAMIENTOS;
  return AYUNTAMIENTOS.filter((a) => enabled.includes(a.slug));
}
