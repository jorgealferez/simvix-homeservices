/**
 * Sembrado de un catálogo público de ejemplo basado en partidas habituales
 * de reforma de vivienda en España (precios orientativos 2026; no son CYPE
 * oficial). Útil para demos.
 *
 * Uso:
 *   tsx prisma/scripts/seed-catalog.ts
 */

import { PrismaClient } from '@prisma/client';
import { importCatalogFromCsv } from '../../src/lib/obras/catalogs';

const prisma = new PrismaClient();

const CSV = `chapter,code,description,unit,unitPrice
01 Demoliciones,01.01.001,"Demolición de tabique de ladrillo hueco de 7 cm con medios manuales, incluido transporte a vertedero",m2,18.5
01 Demoliciones,01.01.002,"Levantado de solado de baldosas con martillo neumático, incluido escombro",m2,12.3
01 Demoliciones,01.01.005,"Desmontaje de carpintería interior, incluido marco y guarniciones",ud,28.0
02 Albañilería,02.01.001,"Fábrica de ladrillo cerámico hueco doble de 9 cm con mortero",m2,32.8
02 Albañilería,02.01.020,"Recibido de carpintería interior con yeso",ud,14.0
03 Revestimientos,03.01.001,"Enfoscado maestreado de mortero de cemento en paramentos verticales",m2,18.6
03 Revestimientos,03.02.005,"Alicatado de azulejo cerámico 20x20 cm, recibido con cemento cola, llaga 2 mm",m2,42.5
03 Revestimientos,03.03.001,"Solado de gres porcelánico 30x60 cm, recibido con cemento cola flexible",m2,46.0
04 Carpintería interior,04.01.001,"Puerta de paso ciega lacada blanca, hoja 35 mm, premarco y herrajes",ud,225.0
04 Carpintería interior,04.02.005,"Armario empotrado con frente lacado y maletero, m² de frente",m2,310.0
05 Fontanería,05.01.001,"Instalación de fontanería en baño completo (lavabo, inodoro, bidé, ducha)",ud,820.0
05 Fontanería,05.02.001,"Punto de agua AF/AC con tubería multicapa",ud,68.5
06 Electricidad,06.01.001,"Punto de luz sencillo con conductor 1,5 mm² y mecanismo blanco",ud,52.0
06 Electricidad,06.02.001,"Cuadro general de mando y protección 12 elementos, IGA + diferencial + magnetotérmicos",ud,420.0
07 Climatización,07.01.001,"Equipo de aire acondicionado split inverter 3000 frigorías, instalación incluida",ud,1450.0
08 Pintura,08.01.001,"Pintura plástica lisa lavable, dos manos, en paramentos verticales y techos",m2,8.6
08 Pintura,08.02.001,"Esmalte sintético sobre carpintería metálica, dos manos",m2,14.3
09 Seguridad y salud,09.01.001,"Equipo de protección individual del operario (casco, guantes, calzado, arnés)",ud,98.0
09 Seguridad y salud,09.02.001,"Cinta de balizamiento bicolor",m,0.85
10 Gestión de residuos,10.01.001,"Contenedor 4 m³ para escombros, recogida y transporte a vertedero autorizado",ud,195.0
10 Gestión de residuos,10.02.001,"Canon de vertido y tasa de gestión por tonelada",t,32.0
`;

async function main() {
  const { catalog, itemsCount } = await importCatalogFromCsv({
    slug: 'demo-reforma-vivienda-2026',
    name: 'Catálogo demo — Reforma de vivienda 2026',
    source: 'PROPIO',
    region: 'España',
    year: 2026,
    priceVersion: '2026-01',
    csv: CSV,
  });
  console.log(`✔ Catálogo sembrado: ${catalog.slug} (${itemsCount} ítems)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
