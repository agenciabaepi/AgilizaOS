'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PublicHeader() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    router.push(`/#${sectionId}`);
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setIsMoreMenuOpen(false);
      }
    };

    if (isMoreMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  return (
    <header className="relative z-10 px-8 py-6 lg:px-12 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex items-center justify-center">
          <Link href="/">
            <Image 
              src="/assets/imagens/logobranco.png" 
              alt="Consert Logo" 
              width={160} 
              height={160}
              className="transition-all duration-500 ease-out hover:scale-110 hover:brightness-110"
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-12">
          <button 
            onClick={() => scrollToSection('solucoes')}
            className="text-white/80 hover:text-white transition-all duration-300 font-light text-lg tracking-wide"
          >
            Soluções
          </button>
          <button 
            onClick={() => scrollToSection('analytics')}
            className="text-white/80 hover:text-white transition-all duration-300 font-light text-lg tracking-wide"
          >
            Analytics
          </button>
          <button 
            onClick={() => scrollToSection('precos')}
            className="text-white/80 hover:text-white transition-all duration-300 font-light text-lg tracking-wide"
          >
            Investimento
          </button>
          <button 
            onClick={() => scrollToSection('recursos')}
            className="text-white/80 hover:text-white transition-all duration-300 font-light text-lg tracking-wide"
          >
            Recursos
          </button>
          
          {/* Dropdown Mais */}
          <div className="relative dropdown-container">
            <button 
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="text-white/80 hover:text-white transition-all duration-300 font-light text-lg tracking-wide flex items-center"
            >
              Mais
              <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            {isMoreMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl z-50">
                <div className="py-2">
                  <Link 
                    href="/sobre" 
                    className="block px-4 py-2 text-white/80 hover:text-[#D1FE6E] hover:bg-white/5 transition-all duration-200"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    Sobre a Empresa
                  </Link>
                  <Link 
                    href="/termos" 
                    className="block px-4 py-2 text-white/80 hover:text-[#D1FE6E] hover:bg-white/5 transition-all duration-200"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    Termos de Uso
                  </Link>
                  <Link 
                    href="/politicas-privacidade" 
                    className="block px-4 py-2 text-white/80 hover:text-[#D1FE6E] hover:bg-white/5 transition-all duration-200"
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    Políticas de Privacidade
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center space-x-6">
          <button 
            onClick={() => router.push('/cadastro')}
            className="px-8 py-3 text-black bg-[#D1FE6E] rounded-full font-medium hover:bg-[#B8E55A] transition-all duration-300 transform hover:scale-105"
          >
            Começar Agora
          </button>
          <button 
            onClick={() => router.push('/login')}
            className="px-8 py-3 text-white border border-white/30 rounded-full font-medium hover:bg-white/10 transition-all duration-300"
          >
            Login
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-4 bg-black/90 backdrop-blur-xl rounded-xl p-6 border border-white/20">
          <div className="flex flex-col space-y-4">
            <button 
              onClick={() => scrollToSection('solucoes')}
              className="text-white hover:text-[#D1FE6E] transition-colors duration-300 font-medium text-left"
            >
              Soluções
            </button>
            <button 
              onClick={() => scrollToSection('analytics')}
              className="text-white hover:text-[#D1FE6E] transition-colors duration-300 font-medium text-left"
            >
              Analytics
            </button>
            <button 
              onClick={() => scrollToSection('precos')}
              className="text-white hover:text-[#D1FE6E] transition-colors duration-300 font-medium text-left"
            >
              Preços
            </button>
            <button 
              onClick={() => scrollToSection('recursos')}
              className="text-white hover:text-[#D1FE6E] transition-colors duration-300 font-medium text-left"
            >
              Recursos
            </button>
            
            {/* Páginas Legais no Mobile */}
            <div className="pt-4 border-t border-[#D1FE6E]/20">
              <p className="text-white/60 text-sm font-medium mb-3">Informações</p>
              <Link 
                href="/sobre" 
                className="block text-white hover:text-[#D1FE6E] transition-colors duration-300 font-medium text-left py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Sobre a Empresa
              </Link>
              <Link 
                href="/termos" 
                className="block text-white hover:text-[#D1FE6E] transition-colors duration-300 font-medium text-left py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Termos de Uso
              </Link>
              <Link 
                href="/politicas-privacidade" 
                className="block text-white hover:text-[#D1FE6E] transition-colors duration-300 font-medium text-left py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Políticas de Privacidade
              </Link>
            </div>
            
            <div className="flex flex-col space-y-3 pt-4 border-t border-[#D1FE6E]/20">
              <button 
                onClick={() => router.push('/cadastro')}
                className="px-6 py-3 text-gray-900 bg-[#D1FE6E] rounded-lg font-semibold hover:bg-[#B8E55A] transition-all duration-300"
              >
                Começar Agora
              </button>
              <button 
                onClick={() => router.push('/login')}
                className="px-6 py-3 text-gray-900 bg-white border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
