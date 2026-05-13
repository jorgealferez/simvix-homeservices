export interface Service {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  icon: string;
  features: string[];
  price: string;
  priceNote: string;
  keywords: string[];
  image: string;
  color: string;
}

export const services: Service[] = [
  {
    id: 'recogida-ninos',
    slug: 'recogida-ninos',
    title: 'Recogida de Niños del Colegio',
    shortDescription:
      'Servicio puntual y de confianza de recogida de niños en el colegio. Personal cualificado con antecedentes verificados.',
    fullDescription:
      'Sabemos lo difícil que es coordinar los horarios laborales con los del colegio. Nuestro servicio de recogida de niños garantiza que tus hijos lleguen a casa de forma segura y puntual. Todo nuestro personal está verificado, con antecedentes penales limpios y formación en primeros auxilios.',
    icon: '🏫',
    features: [
      'Personal con antecedentes verificados',
      'Puntualidad garantizada',
      'Acompañamiento hasta casa o lugar acordado',
      'Comunicación en tiempo real con los padres',
      'Formación en primeros auxilios',
      'Servicio disponible de lunes a viernes',
    ],
    price: 'Desde 8€/recogida',
    priceNote: 'Descuentos por bono mensual',
    keywords: [
      'recogida niños colegio',
      'recoger niños escuela',
      'servicio recogida escolar',
      'acompañamiento niños colegio',
    ],
    image: '/images/recogida-ninos.jpg',
    color: 'blue',
  },
  {
    id: 'limpieza-hogar',
    slug: 'limpieza-hogar',
    title: 'Limpieza del Hogar',
    shortDescription:
      'Limpieza profesional de tu hogar con productos de calidad. Servicio regular o puntual según tus necesidades.',
    fullDescription:
      'Nuestro equipo de limpieza profesional cuida tu hogar como si fuera el suyo. Utilizamos productos respetuosos con el medio ambiente y técnicas eficaces para dejar tu casa impecable. Puedes contratar limpieza regular semanal, quincenal o mensual, o un servicio puntual para ocasiones especiales.',
    icon: '🏠',
    features: [
      'Personal de limpieza verificado y con experiencia',
      'Productos eco-friendly incluidos',
      'Limpieza regular o puntual',
      'Zonas húmedas, salones, dormitorios y cocina',
      'Plancha de ropa disponible',
      'Horarios flexibles adaptados a ti',
    ],
    price: 'Desde 15€/hora',
    priceNote: 'Presupuesto personalizado según m²',
    keywords: [
      'limpieza hogar',
      'limpieza doméstica',
      'servicio limpieza casa',
      'limpiadora hogar profesional',
    ],
    image: '/images/limpieza-hogar.jpg',
    color: 'green',
  },
  {
    id: 'ninera',
    slug: 'ninera',
    title: 'Niñera y Cuidado de Niños',
    shortDescription:
      'Niñeras cualificadas para el cuidado de tus hijos en casa. Servicio de tarde, noche o fin de semana.',
    fullDescription:
      'Nuestras niñeras son profesionales con formación en educación infantil o experiencia acreditada. Se encargan del cuidado, entretenimiento y seguridad de tus hijos mientras tú trabajas o disfrutas de tiempo personal. Disponemos de niñeras para cubrir tardes de lunes a viernes, noches y fines de semana.',
    icon: '👶',
    features: [
      'Niñeras con formación acreditada',
      'Antecedentes penales verificados',
      'Ayuda con deberes escolares',
      'Actividades educativas y lúdicas',
      'Disponibilidad tardes, noches y fines de semana',
      'Servicio de emergencia con disponibilidad rápida',
    ],
    price: 'Desde 12€/hora',
    priceNote: 'Bonos de horas con descuento',
    keywords: [
      'niñera',
      'cuidado niños',
      'canguro niños',
      'cuidadora infantil',
      'niñera profesional',
    ],
    image: '/images/ninera.jpg',
    color: 'pink',
  },
  {
    id: 'hacer-la-compra',
    slug: 'hacer-la-compra',
    title: 'Hacer la Compra',
    shortDescription:
      'Te hacemos la compra en el supermercado de tu elección. Ahorra tiempo y olvídate de las colas.',
    fullDescription:
      'Nuestro servicio de compra a domicilio te libera de una de las tareas más repetitivas del hogar. Solo tienes que enviarnos tu lista de la compra, indicarnos el supermercado de tu preferencia y nos encargamos del resto: compramos, revisamos productos y te lo entregamos directamente en tu puerta.',
    icon: '🛒',
    features: [
      'Compra en el supermercado que prefieras',
      'Entrega a domicilio incluida',
      'Revisión de fechas de caducidad',
      'Selección de mejores precios y ofertas',
      'Compras recurrentes con lista guardada',
      'Disponible 7 días a la semana',
    ],
    price: 'Desde 10€/servicio',
    priceNote: 'Más el importe de la compra',
    keywords: [
      'hacer la compra',
      'compra a domicilio',
      'servicio compra supermercado',
      'recado compra hogar',
    ],
    image: '/images/hacer-la-compra.jpg',
    color: 'orange',
  },
  {
    id: 'cuidado-mayores',
    slug: 'cuidado-mayores',
    title: 'Cuidado de Personas Mayores',
    shortDescription:
      'Acompañamiento y cuidado profesional de personas mayores en su propio domicilio, con respeto y calidez.',
    fullDescription:
      'Creemos que las personas mayores merecen el mejor cuidado en la comodidad de su hogar. Nuestros cuidadores profesionales ofrecen acompañamiento, ayuda con la medicación, gestión de citas médicas, higiene personal y estimulación cognitiva. Trabajamos para mantener la autonomía y dignidad de cada persona.',
    icon: '👴',
    features: [
      'Cuidadores con formación en geriatría',
      'Ayuda con higiene personal y aseo',
      'Gestión y recuerdo de medicación',
      'Acompañamiento a citas médicas',
      'Estimulación cognitiva y compañía',
      'Informes diarios a la familia',
    ],
    price: 'Desde 14€/hora',
    priceNote: 'Planes mensuales con descuento',
    keywords: [
      'cuidado personas mayores',
      'cuidador mayores domicilio',
      'asistencia mayores hogar',
      'acompañante personas mayores',
    ],
    image: '/images/cuidado-mayores.jpg',
    color: 'purple',
  },
  {
    id: 'otros-servicios',
    slug: 'otros-servicios',
    title: 'Otros Servicios Domésticos',
    shortDescription:
      'Gestiones del hogar, recados, trámites y todo aquello que necesites delegar para ganar tiempo y tranquilidad.',
    fullDescription:
      'Además de nuestros servicios estrella, ofrecemos una amplia gama de tareas domésticas y recados: recogida de paquetes, gestiones bancarias o administrativas, llevar y recoger ropa en la tintorería, paseo de mascotas, montaje de muebles y más. Cuéntanos lo que necesitas y buscamos la solución.',
    icon: '✨',
    features: [
      'Recados y gestiones personalizadas',
      'Paseo y cuidado de mascotas',
      'Montaje de muebles y pequeñas reparaciones',
      'Recogida y entrega de paquetes',
      'Tintorería y lavandería',
      'Consulta sin compromiso',
    ],
    price: 'Presupuesto a medida',
    priceNote: 'Contacta para más información',
    keywords: [
      'servicios domésticos',
      'recados hogar',
      'ayuda domicilio',
      'asistente hogar',
    ],
    image: '/images/otros-servicios.jpg',
    color: 'yellow',
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export const serviceColorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};
