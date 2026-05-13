'use client';

import { useState } from 'react';
import { services } from '@/lib/services';

interface FormState {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ContactForm() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: '',
  });
  const [status, setStatus] = useState<SubmitStatus>('idle');

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('loading');

    try {
      // Replace with actual API endpoint / form service
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        setStatus('success');
        setForm({ name: '', email: '', phone: '', service: '', message: '' });
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
              Servicio de interés <span className="text-red-500" aria-hidden="true">*</span>
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
              ❌ Ha ocurrido un error. Inténtalo de nuevo o llámanos al +34 900 000 000.
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-bold text-lg py-4 rounded-xl shadow-md hover:shadow-lg transition-all"
          >
            {status === 'loading' ? 'Enviando...' : 'Solicitar servicio →'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Tus datos son seguros y no serán compartidos con terceros.
          </p>
        </form>
      </div>
    </section>
  );
}
