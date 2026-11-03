'use client';

import { useEffect, useState } from 'react';
import { services } from '@/lib/services';
import { zonas } from '@/lib/zonas';
import { CONTACT } from '@/lib/site';

interface FormState {
  name: string;
  email: string;
  phone: string;
  service: string;
  rol: 'familia' | 'profesional';
  zona: string;
  message: string;
  consentimiento: boolean;
  origen: string;
}

const VACIO: FormState = {
  name: '',
  email: '',
  phone: '',
  service: '',
  rol: 'familia',
  zona: '',
  message: '',
  consentimiento: false,
  origen: '',
};

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(VACIO);
  const [status, setStatus] = useState<SubmitStatus>('idle');

  // Prerrellena desde la URL (?servicio=&zona=&rol=&utm_source=): así un
  // anuncio o una página de zona llevan al formulario ya situado.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const servicio = q.get('servicio') ?? '';
    const zona = q.get('zona') ?? '';
    const rol = q.get('rol');
    const origen = [q.get('utm_source'), q.get('utm_campaign')].filter(Boolean).join(':');
    setForm((prev) => ({
      ...prev,
      service: services.some((s) => s.id === servicio) ? servicio : prev.service,
      zona: zonas.some((z) => z.slug === zona) ? zona : prev.zona,
      rol: rol === 'profesional' ? 'profesional' : prev.rol,
      origen: origen.replace(/[^\w.:/-]/g, '').slice(0, 80),
    }));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    const checked = e.target instanceof HTMLInputElement && e.target.type === 'checkbox' ? e.target.checked : undefined;
    setForm((prev) => ({ ...prev, [name]: checked ?? value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');

    try {
      // Replace with actual API endpoint / form service
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, zona: form.zona || 'otra' }),
      });

      if (response.ok) {
        setStatus('success');
        setForm({ ...VACIO, origen: form.origen });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <section
      className="py-20 bg-white"
      aria-labelledby="contact-heading"
      id="contacto"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-block bg-accent-100 text-accent-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Contacto
          </span>
          <h2
            id="contact-heading"
            className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4"
          >
            Solicita tu servicio hoy
          </h2>
          <p className="text-lg text-gray-600">
            Rellena el formulario y te contactamos en menos de 24 horas.
            Sin permanencia ni compromisos.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-50 rounded-2xl p-8 shadow-sm space-y-6"
          noValidate
        >
          {/* Rol: familia que pide o profesional que se apunta */}
          <fieldset>
            <legend className="block text-sm font-semibold text-gray-700 mb-2">Soy…</legend>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['familia', 'Busco un servicio'],
                ['profesional', 'Quiero trabajar'],
              ] as const).map(([valor, etiqueta]) => (
                <label
                  key={valor}
                  className={`flex items-center gap-2 border rounded-lg px-4 py-3 cursor-pointer ${form.rol === valor ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-white'}`}
                >
                  <input
                    type="radio"
                    name="rol"
                    value={valor}
                    checked={form.rol === valor}
                    onChange={handleChange}
                  />
                  <span className="text-gray-900">{etiqueta}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Nombre completo <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Tu nombre y apellidos"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          </div>

          {/* Email + Phone row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Email <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Teléfono
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+34 600 000 000"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Service selector */}
          <div>
            <label
              htmlFor="service"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              {form.rol === 'profesional' ? 'Trabajo que buscas' : 'Servicio de interés'} <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="service"
              name="service"
              required
              value={form.service}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white"
            >
              <option value="">Selecciona un servicio</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Zona */}
          <div>
            <label htmlFor="zona" className="block text-sm font-semibold text-gray-700 mb-2">
              Municipio
            </label>
            <select
              id="zona"
              name="zona"
              value={form.zona}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white"
            >
              <option value="">Selecciona tu municipio</option>
              {zonas.map((z) => (
                <option key={z.slug} value={z.slug}>
                  {z.nombre}
                </option>
              ))}
              <option value="otra">Otro municipio</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label
              htmlFor="message"
              className="block text-sm font-semibold text-gray-700 mb-2"
            >
              Cuéntanos más
            </label>
            <textarea
              id="message"
              name="message"
              rows={4}
              value={form.message}
              onChange={handleChange}
              placeholder="Descríbenos qué necesitas, horarios, zona..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none"
            />
          </div>

          {/* Consentimiento RGPD */}
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              name="consentimiento"
              required
              checked={form.consentimiento}
              onChange={handleChange}
              className="mt-1"
            />
            <span>
              Acepto que Simvix trate mis datos para responder a esta solicitud
              {form.rol === 'profesional' ? ' y valorar mi candidatura' : ''}. No los
              cedemos a terceros y puedes pedir que los borremos en {CONTACT.email}. Más
              información en la{' '}
              <a href="/privacidad" target="_blank" className="underline">
                política de privacidad
              </a>
              .
            </span>
          </label>

          {/* Status messages */}
          {status === 'success' && (
            <div
              role="alert"
              className="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm"
            >
              ✅ ¡Mensaje enviado! Te contactaremos en menos de 24 horas.
            </div>
          )}
          {status === 'error' && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm"
            >
              ❌ Ha ocurrido un error. Revisa los campos y acepta el tratamiento de datos, o llámanos al {CONTACT.telefono}.
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'loading' || !form.consentimiento}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-bold text-lg py-4 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {status === 'loading'
              ? 'Enviando...'
              : form.rol === 'profesional'
                ? 'Quiero trabajar con vosotros →'
                : 'Solicitar servicio →'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Sin permanencia. A las profesionales nunca les cobramos nada.
          </p>
        </form>
      </div>
    </section>
  );
}
