/**
 * Zonas de captación de Simvix Home Services.
 *
 * Cada zona es a la vez un mercado de familias (demanda: /zonas/<slug>) y una
 * bolsa de profesionales (oferta: /empleo/<slug>). El orden es el de
 * prioridad de apertura: se empieza por Parla (piloto) y se crece por
 * municipios colindantes, para que una profesional nunca cruce media
 * Comunidad de Madrid para hacer un servicio de dos horas.
 *
 * Son datos, no prosa: las páginas, el sitemap, el JSON-LD y llms.txt se
 * generan desde aquí. Añadir una zona = añadir un objeto; `npm run test:zonas`
 * comprueba que es coherente.
 */

export type Prioridad = 'piloto' | 'expansion-1' | 'expansion-2';

export interface Zona {
  slug: string;
  nombre: string;
  provincia: string;
  comunidad: string;
  /** Códigos postales del municipio. Se usan para encajar leads y anuncios. */
  codigosPostales: string[];
  /** Centro aproximado del municipio (WGS84). */
  geo: { lat: number; lng: number };
  prioridad: Prioridad;
  /** Slugs de las zonas colindantes que cubre el mismo equipo. */
  vecinas: string[];
  /** Una frase propia de la zona para que cada página sea útil y no un duplicado. */
  contexto: string;
  /** Barrios o áreas reconocibles que la gente escribe al buscar. */
  barrios: string[];
}

export const zonas: Zona[] = [
  {
    slug: 'parla',
    nombre: 'Parla',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    codigosPostales: ['28980', '28981', '28982', '28983', '28984'],
    geo: { lat: 40.2364, lng: -3.7676 },
    prioridad: 'piloto',
    vecinas: ['pinto', 'fuenlabrada', 'getafe', 'humanes-de-madrid'],
    contexto:
      'Parla es nuestra zona piloto: el equipo vive en el propio municipio y en los colindantes, así que los desplazamientos son cortos y la sustitución es rápida.',
    barrios: ['Parla Este', 'Centro', 'Fuentebella', 'Villa Juventus'],
  },
  {
    slug: 'pinto',
    nombre: 'Pinto',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    codigosPostales: ['28320'],
    geo: { lat: 40.2416, lng: -3.6996 },
    prioridad: 'piloto',
    vecinas: ['parla', 'valdemoro', 'getafe'],
    contexto:
      'Pinto comparte equipo con Parla y Valdemoro: la misma profesional puede encadenar servicios en los tres municipios sin perder horas en el coche.',
    barrios: ['Centro', 'La Tenería'],
  },
  {
    slug: 'fuenlabrada',
    nombre: 'Fuenlabrada',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    codigosPostales: ['28940', '28941', '28942', '28943', '28944', '28945', '28946', '28947'],
    geo: { lat: 40.2842, lng: -3.7942 },
    prioridad: 'expansion-1',
    vecinas: ['parla', 'humanes-de-madrid', 'leganes', 'getafe', 'mostoles'],
    contexto:
      'Fuenlabrada es uno de los municipios más poblados del sur de Madrid; lo cubrimos con profesionales que viven allí y en Parla y Humanes.',
    barrios: ['Centro', 'Loranca', 'El Naranjo', 'La Avanzada', 'Vivero'],
  },
  {
    slug: 'getafe',
    nombre: 'Getafe',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    codigosPostales: ['28901', '28902', '28903', '28904', '28905', '28906', '28907', '28909'],
    geo: { lat: 40.3057, lng: -3.7329 },
    prioridad: 'expansion-1',
    vecinas: ['parla', 'pinto', 'leganes', 'fuenlabrada'],
    contexto:
      'En Getafe lo más habitual es la limpieza regular semanal o quincenal, siempre con la misma persona.',
    barrios: ['Centro', 'El Bercial', 'Getafe Norte', 'Los Molinos', 'Sector III', 'Perales del Río'],
  },
  {
    slug: 'leganes',
    nombre: 'Leganés',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    codigosPostales: ['28911', '28912', '28913', '28914', '28915', '28916', '28917', '28918', '28919'],
    geo: { lat: 40.3272, lng: -3.7635 },
    prioridad: 'expansion-1',
    vecinas: ['getafe', 'fuenlabrada', 'alcorcon'],
    contexto:
      'En Leganés ofrecemos limpieza regular de pisos y limpiezas a fondo de entrada y salida de alquiler.',
    barrios: ['Centro', 'Zarzaquemada', 'El Carrascal', 'Leganés Norte', 'Arroyo Culebro'],
  },
  {
    slug: 'humanes-de-madrid',
    nombre: 'Humanes de Madrid',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    codigosPostales: ['28970'],
    geo: { lat: 40.2504, lng: -3.8278 },
    prioridad: 'expansion-1',
    vecinas: ['parla', 'fuenlabrada'],
    contexto:
      'Humanes de Madrid linda con Parla y Fuenlabrada; es una buena zona para profesionales que viven allí y quieren trabajar cerca de casa.',
    barrios: ['Centro'],
  },
  {
    slug: 'valdemoro',
    nombre: 'Valdemoro',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    codigosPostales: ['28340', '28341', '28342', '28343'],
    geo: { lat: 40.1908, lng: -3.6739 },
    prioridad: 'expansion-2',
    vecinas: ['pinto'],
    contexto:
      'En viviendas unifamiliares y adosados, como muchas de Valdemoro, conviene reservar servicios de 4 horas o más e incluir plancha.',
    barrios: ['Centro', 'El Restón'],
  },
  {
    slug: 'mostoles',
    nombre: 'Móstoles',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    codigosPostales: ['28931', '28932', '28933', '28934', '28935', '28936', '28937', '28938'],
    geo: { lat: 40.3223, lng: -3.8649 },
    prioridad: 'expansion-2',
    vecinas: ['fuenlabrada', 'alcorcon'],
    contexto:
      'Móstoles se abre en la segunda ola, cuando el equipo de Fuenlabrada tenga volumen para cubrirlo sin alargar los desplazamientos.',
    barrios: ['Centro', 'Parque Coimbra', 'Villafontana', 'El Soto'],
  },
  {
    slug: 'alcorcon',
    nombre: 'Alcorcón',
    provincia: 'Madrid',
    comunidad: 'Comunidad de Madrid',
    codigosPostales: ['28921', '28922', '28923', '28924', '28925'],
    geo: { lat: 40.3458, lng: -3.8249 },
    prioridad: 'expansion-2',
    vecinas: ['leganes', 'mostoles'],
    contexto:
      'Alcorcón se cubre junto con Leganés y Móstoles, con limpieza regular, limpiezas puntuales y acompañamiento de mayores en casa.',
    barrios: ['Centro', 'Parque Lisboa', 'Ensanche Sur', 'Fuente Cisneros', 'Parque Oeste'],
  },
];

export function getZona(slug: string): Zona | undefined {
  return zonas.find((z) => z.slug === slug);
}

export function vecinasDe(zona: Zona): Zona[] {
  return zona.vecinas
    .map((s) => getZona(s))
    .filter((z): z is Zona => Boolean(z));
}

/** Zona a la que pertenece un código postal (para encajar leads y anuncios). */
export function zonaPorCodigoPostal(cp: string): Zona | undefined {
  const limpio = cp.trim();
  return zonas.find((z) => z.codigosPostales.includes(limpio));
}

export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  piloto: 'Zona piloto',
  'expansion-1': 'Abriendo ahora',
  'expansion-2': 'Próxima apertura',
};

/**
 * Condiciones de la oferta de empleo. `salarioHoraBrutoDesde` se deja en null
 * hasta que el usuario fije la cifra (no se inventa un salario); mientras sea
 * null, la página y el JobPosting no publican importe.
 */
export const ofertaEmpleo = {
  titulo: 'Empleada/o del hogar y limpieza por horas',
  tipoContrato: 'PART_TIME' as const,
  salarioHoraBrutoDesde: null as number | null,
  fechaPublicacion: '2026-11-02',
  diasVigencia: 90,
  condiciones: [
    'Contrato laboral y alta en la Seguridad Social desde el primer día',
    'Servicios en tu municipio y en los de al lado: nada de cruzar Madrid',
    'Tú eliges las franjas en las que estás disponible',
    'Cobro mensual por nómina, con las horas extra y festivos pagados',
    'Formación en prevención de riesgos y productos, a cargo de la empresa',
    'Si una familia no te trata bien, te reasignamos: no tienes que aguantar',
  ],
  requisitos: [
    'Permiso de trabajo en España',
    'Experiencia en limpieza de hogares (no hace falta titulación)',
    'Referencias o disposición a una prueba pagada',
  ],
};
