'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Search, LogIn, Bell } from 'lucide-react';

const categories = [
  'Últimas Notícias', 'Política', 'Saúde', 'Economia', 'Esportes', 'Cultura', 'Negócios'
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600 flex gap-4">
            <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>Temperatura: 28°C</span>
          </div>
          <div className="flex gap-4 text-sm">
            <a href="#" className="text-gray-600 hover:text-[#991B1B]">Facebook</a>
            <a href="#" className="text-gray-600 hover:text-[#991B1B]">Twitter</a>
            <a href="#" className="text-gray-600 hover:text-[#991B1B]">Instagram</a>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-10 h-10 bg-[#991B1B] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">PZ</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-lg text-gray-900">AO PONTO BR</h1>
                <p className="text-xs text-gray-500">Jornalismo • Informação • Entretenimento</p>
              </div>
            </Link>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 mx-8">
              <div className="w-full relative">
                <input
                  type="text"
                  placeholder="Pesquisar notícias..."
                  className="w-full px-4 py-2 rounded-full border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:border-[#991B1B] focus:bg-white"
                />
                <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-full"
              >
                <Search className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Bell className="w-5 h-5" />
              </button>
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-full"
              >
                <LogIn className="w-4 h-4" />
                <span className="text-sm">Entrar</span>
              </Link>
              <Link
                href="/subscribe"
                className="bg-[#991B1B] text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-[#7F1D1D] transition"
              >
                Assinar
              </Link>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-full"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          {isSearchOpen && (
            <div className="md:hidden mb-4">
              <input
                type="text"
                placeholder="Pesquisar notícias..."
                className="w-full px-4 py-2 rounded-full border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:border-[#991B1B]"
              />
            </div>
          )}

          {/* Main Menu */}
          <div className="hidden md:flex overflow-x-auto scrollbar-hide">
            <div className="flex gap-1">
              {categories.map((category) => (
                <Link
                  key={category}
                  href={`/categoria/${category.toLowerCase().replace(/\s+/g, '-')}`}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#991B1B] hover:bg-[#991B1B]/5 rounded whitespace-nowrap transition"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 p-4 space-y-2 max-h-96 overflow-y-auto">
          {categories.map((category) => (
            <Link
              key={category}
              href={`/categoria/${category.toLowerCase().replace(/\s+/g, '-')}`}
              className="block px-4 py-2 text-gray-700 hover:bg-[#991B1B]/5 hover:text-[#991B1B] rounded"
            >
              {category}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
