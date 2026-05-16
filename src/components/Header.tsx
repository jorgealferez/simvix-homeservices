'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🏡</span>
            <span className="font-bold text-xl text-primary-700">
              Simvix<span className="text-accent-600"> Home</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-600 hover:text-primary-700 font-medium transition-colors"
            >
              Inicio
            </Link>
            <Link
              href="/servicios"
              className="text-gray-600 hover:text-primary-700 font-medium transition-colors"
            >
              Servicios
            </Link>
            <Link
              href="/obras"
              className="text-gray-600 hover:text-primary-700 font-medium transition-colors"
            >
              🏗️ Obras
            </Link>
            <Link
              href="/contacto"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium transition-colors"
            >
              Solicitar Servicio
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-primary-700"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <nav className="md:hidden pb-4 flex flex-col gap-3">
            <Link
              href="/"
              className="text-gray-600 hover:text-primary-700 font-medium py-2"
              onClick={() => setMenuOpen(false)}
            >
              Inicio
            </Link>
            <Link
              href="/servicios"
              className="text-gray-600 hover:text-primary-700 font-medium py-2"
              onClick={() => setMenuOpen(false)}
            >
              Servicios
            </Link>
            <Link
              href="/obras"
              className="text-gray-600 hover:text-primary-700 font-medium py-2"
              onClick={() => setMenuOpen(false)}
            >
              🏗️ Obras
            </Link>
            <Link
              href="/contacto"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-center"
              onClick={() => setMenuOpen(false)}
            >
              Solicitar Servicio
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
