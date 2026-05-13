import Link from 'next/link';
import type { Service } from '@/lib/services';
import { serviceColorMap } from '@/lib/services';

interface ServiceCardProps {
  service: Service;
  variant?: 'grid' | 'featured';
}

export default function ServiceCard({
  service,
  variant = 'grid',
}: ServiceCardProps) {
  const colorClasses =
    serviceColorMap[service.color] ||
    'bg-blue-100 text-blue-700 border-blue-200';

  if (variant === 'featured') {
    return (
      <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden flex flex-col">
        <div className={`p-6 border-b ${colorClasses}`}>
          <span className="text-4xl" aria-hidden="true">
            {service.icon}
          </span>
        </div>
        <div className="p-6 flex flex-col flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {service.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1">
            {service.shortDescription}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-primary-700 font-semibold text-sm">
              {service.price}
            </span>
            <Link
              href={`/servicios/${service.slug}`}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
            >
              Saber más
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <span className="text-3xl" aria-hidden="true">
          {service.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 mb-1">
            {service.title}
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {service.shortDescription}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-primary-700 font-semibold text-sm">
          {service.price}
        </span>
        <Link
          href={`/servicios/${service.slug}`}
          className="text-sm bg-primary-50 text-primary-700 hover:bg-primary-100 px-3 py-1 rounded-md font-medium transition-colors"
        >
          Ver servicio
        </Link>
      </div>
    </div>
  );
}
