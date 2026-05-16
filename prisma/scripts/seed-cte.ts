/**
 * Siembra los 6 Documentos Básicos del CTE como KnowledgeDoc + chunks,
 * con resúmenes de cada exigencia para permitir RAG en agentes (P12).
 *
 * Los textos son resúmenes operativos — el cliente final debe consultar
 * la versión oficial en https://www.codigotecnico.org.
 */

import { PrismaClient } from '@prisma/client';
import { ingestDocument } from '../../src/lib/obras/rag';

const prisma = new PrismaClient();

const DBS = [
  {
    slug: 'cte-db-he',
    title: 'CTE DB-HE — Ahorro de energía',
    body: `# DB-HE Ahorro de energía

## HE0 — Limitación del consumo energético
El consumo energético del edificio se limita en función del clima y tipo de uso.
Para reforma con cambio de instalaciones térmicas, se aplica cuando la
intervención afecta a más del 25% de la envolvente o renovación completa.

## HE1 — Limitación de la demanda térmica
Transmitancia térmica límite por elemento (U_lim, W/m²K) y por zona climática
(α, A, B, C, D, E). Verificación por opción simplificada o por simulación
horaria (HULC, CE3X, similares).

## HE2 — Instalaciones térmicas
Cumplimiento del RITE. Equipos con clase A o superior, recuperación de calor
en ventilación mecánica si caudal > 0,5 m³/s.

## HE3 — Iluminación
Valor de eficiencia energética de la instalación (VEEI) máximo por uso del
local. Sistemas de control y regulación obligatorios en grandes superficies.

## HE4 — Contribución mínima de energía renovable a ACS
% mínimo de aporte solar térmico o equivalente según demanda y zona climática.

## HE5 — Generación renovable eléctrica
Edificios > 1000 m² construidos o ampliaciones > 50% deben incorporar
generación eléctrica renovable (típicamente fotovoltaica en cubierta).`,
    region: undefined,
  },
  {
    slug: 'cte-db-hr',
    title: 'CTE DB-HR — Protección frente al ruido',
    body: `# DB-HR Protección frente al ruido

## Requisitos de aislamiento acústico
- Aislamiento a ruido aéreo entre recintos protegidos: D_nT,A ≥ 50 dBA.
- Aislamiento a ruido aéreo de fachada: depende del índice de ruido día (Ld) y categoría.
- Aislamiento a ruido de impacto: L'_nT,w ≤ 65 dB entre viviendas.

## Verificación
Por la opción simplificada (tabla de soluciones constructivas pre-tabuladas) o
por método de cálculo según UNE-EN 12354.

## Tiempo de reverberación
En aulas, salas de conferencia y restaurantes hay valores límite de T_60.`,
  },
  {
    slug: 'cte-db-si',
    title: 'CTE DB-SI — Seguridad en caso de incendio',
    body: `# DB-SI Seguridad en caso de incendio

## SI1 — Propagación interior
Sectorización por tamaño y uso (ej. residencial vivienda: sector cada 2500 m²).
Resistencia al fuego de elementos separadores: EI 60 estándar.

## SI2 — Propagación exterior
Distancias entre huecos en fachadas a sector adyacente.
Cubiertas: clase de reacción al fuego BROOF (t1).

## SI3 — Evacuación
Cálculo de ocupación según uso (m²/persona).
Anchura de pasillos y puertas: A ≥ P/200 (P = personas), mínimo absoluto.
Distancia máxima de evacuación: 25 m con una salida; 50 m con dos salidas.

## SI4 — Instalaciones de protección
Extintores cada 15 m de recorrido.
BIE, columna seca, detectores y rociadores según superficie y altura.

## SI5 — Intervención de los bomberos
Espacio de maniobra exterior, viales de aproximación.

## SI6 — Resistencia estructural
R 60 a R 120 según altura y uso.`,
  },
  {
    slug: 'cte-db-sua',
    title: 'CTE DB-SUA — Seguridad de utilización y accesibilidad',
    body: `# DB-SUA Seguridad de utilización y accesibilidad

## SUA1 — Caídas
Pavimentos: clase 1-3 según pendiente. Discontinuidades < 4 mm.
Escaleras: huella 28 cm, contrahuella 13-17,5 cm, mismo número de peldaños
por tramo (3-16 escalones).

## SUA2 — Impactos
Vidrios accesibles: laminado o templado, marcado.

## SUA3 — Aprisionamiento
Puertas con sentido de apertura. Aseos accesibles, condena exterior.

## SUA4-5 — Iluminación e instalaciones
Mínimo 100 lux en zonas circulación interior. Sistemas de emergencia.

## SUA9 — Accesibilidad
Itinerario accesible: ancho ≥ 1,20 m, sin escalón. Puertas 80 cm libres.
Aseo adaptado: diámetro libre 1,50 m.
Plaza de aparcamiento accesible 1 cada 40 (uso administrativo).
Ascensor accesible: cabina 1,10 x 1,40 m.`,
  },
  {
    slug: 'cte-db-hs',
    title: 'CTE DB-HS — Salubridad',
    body: `# DB-HS Salubridad

## HS1 — Protección frente a la humedad
Aislamiento de muros en contacto con terreno. Cubiertas con membrana
impermeabilizante. Encuentros tratados.

## HS2 — Recogida y evacuación de residuos
Almacén dimensionado por nº viviendas + cuarto de basura accesible.

## HS3 — Calidad del aire interior
Ventilación mecánica obligatoria en vivienda nueva o reforma con cambio de
instalaciones (caudales mín por estancia, UNE 100012).

## HS4 — Suministro de agua
Dimensionado de acometida + presión mínima 100 kPa en grifos.

## HS5 — Evacuación de aguas
Bajantes y colectores dimensionados; arquetas registrables.

## HS6 — Protección frente al radón
Aplicable en zonas con alto nivel de radón natural (PGOU lo identifica).
Barrera de protección obligatoria.`,
  },
  {
    slug: 'cte-db-se',
    title: 'CTE DB-SE — Seguridad estructural',
    body: `# DB-SE Seguridad estructural

Documento básico transversal con:

## SE-AE — Acciones en la edificación
Cargas permanentes, variables (uso, viento, nieve), accidentales (sismo).

## SE-C — Cimentaciones
Tipos: superficial (zapatas, losa), profunda (pilotes).

## SE-A — Acero, SE-F — Fábrica, SE-M — Madera
Materiales con sus métodos de verificación.

## Combinaciones de acciones
ELU y ELS según γ_G, γ_Q y ψ_i.

## Verificaciones
Resistencia, estabilidad, aptitud al servicio (deformaciones,
desplazamientos, vibraciones).`,
  },
];

async function main() {
  for (const db of DBS) {
    const r = await ingestDocument({
      slug: db.slug,
      title: db.title,
      kind: 'CTE_DB',
      region: db.region,
      source: 'https://www.codigotecnico.org/',
      version: '2025',
      body: db.body,
    });
    console.log(`✔ ${db.slug}: ${r.chunks} chunks`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
