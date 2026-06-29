'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useAppleParallax } from '@/hooks/useParallax';
import FeaturesCarousel from '@/components/landing/FeaturesCarousel';
import SystemShowcaseSlider from '@/components/landing/SystemShowcaseSlider';
import PricingSection from '@/components/landing/PricingSection';
import AppShowcase from '@/components/landing/AppShowcase';
import { abrirWhatsApp } from '@/config/contato';
import { LANDING_TRIAL, SYSTEM_FEATURES } from '@/config/landing';

export default function Home() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true); // Padrão: modo escuro
  
  // Hook para animações de scroll reveal
  const { isAnimated } = useScrollReveal();
  
  // Hook para efeitos parallax estilo Apple
  const { getHeroTransform, getBackgroundTransform, getSectionTransform } = useAppleParallax();
  
  
  // ✅ ACESSO TOTALMENTE LIVRE: Sem verificações de autenticação
  // Usuário pode acessar qualquer página sem redirecionamentos

  // Persistir tema no localStorage (apenas com API de storage válida no browser)
  useEffect(() => {
    try {
      const ls = typeof window !== 'undefined' ? window.localStorage : null;
      if (!ls || typeof ls.getItem !== 'function') return;
      const savedTheme = ls.getItem('theme');
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      const ls = typeof window !== 'undefined' ? window.localStorage : null;
      if (!ls || typeof ls.setItem !== 'function') return;
      ls.setItem('theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [isDarkMode]);

  // Inicializa a posição do mouse com valores negativos para que o efeito não apareça inicialmente
  const [mousePosition, setMousePosition] = useState({ x: -100, y: -100 });
  const [scrollY, setScrollY] = useState(0);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const handleContatoEquipe = () => {
    abrirWhatsApp();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseLeave = () => {
      setMousePosition({ x: -100, y: -100 });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Fechar dropdown quando clicar fora
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target;
      // Verificar se o target é um Element e tem o método closest
      if (target && typeof (target as any).closest === 'function') {
        const dropdownButton = (target as Element).closest('button');
        if (!dropdownButton || !dropdownButton.textContent?.includes('Mais')) {
          setIsMoreMenuOpen(false);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-white'}`} style={{ overflow: 'visible' }}>
      {/* Background Pattern com Parallax */}
      <div className="absolute inset-0" style={{ overflow: 'visible' }}>
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: isDarkMode 
              ? `
                linear-gradient(rgba(209, 254, 110, 0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(209, 254, 110, 0.08) 1px, transparent 1px)
              `
              : `
                linear-gradient(rgba(0, 0, 0, 0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 0, 0, 0.02) 1px, transparent 1px)
              `,
            backgroundSize: '100px 100px',
            ...getBackgroundTransform(0.3)
          }}
        ></div>
      </div>

      {/* Subtle Gradient Overlay com Parallax */}
      <div 
        className={`absolute inset-0 opacity-40 ${
          isDarkMode 
            ? 'bg-gradient-to-t from-black via-transparent to-transparent' 
            : 'bg-gradient-to-t from-gray-50 via-transparent to-transparent'
        }`}
        style={getBackgroundTransform(0.2)}
      ></div>
      <div 
        className={`absolute inset-0 opacity-20 ${
          isDarkMode 
            ? 'bg-gradient-to-b from-black via-transparent to-transparent' 
            : 'bg-gradient-to-b from-gray-100 via-transparent to-transparent'
        }`}
        style={getBackgroundTransform(0.1)}
      ></div>

      {/* Vagalume Effect - Só aparece quando o mouse está na tela e não no canto */}
      {mousePosition.x > 50 && mousePosition.y > 50 && (
        <div 
          className="fixed pointer-events-none z-50 transition-transform duration-100 ease-out"
          style={{
            left: mousePosition.x - 25,
            top: mousePosition.y - 25,
            transform: 'translate(0, 0)',
            opacity: 1
          }}
        >
          <div className="w-12 h-12 bg-[#D1FE6E] rounded-full opacity-60 blur-sm animate-pulse"></div>
          <div className="w-8 h-8 bg-[#D1FE6E] rounded-full opacity-40 blur-sm animate-pulse absolute top-2 left-2"></div>
          <div className="w-4 h-4 bg-[#D1FE6E] rounded-full opacity-20 blur-sm animate-pulse absolute top-4 left-4"></div>
        </div>
      )}

      {/* Navigation */}
      <nav className={`relative z-10 px-8 py-6 lg:px-12 backdrop-blur-xl border-b transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-black/80 border-white/10' 
          : 'bg-white/80 border-gray-300'
      }`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <Image 
              src={isDarkMode ? "/assets/imagens/logobranco.png" : "/assets/imagens/logopreto.png"} 
              alt="Consert Logo" 
              width={160} 
              height={160}
              className="transition-all duration-500 ease-out hover:scale-110 hover:brightness-110"
            />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-12">
            <button 
              onClick={() => scrollToSection('solucoes')}
              className={`transition-all duration-300 font-light text-lg tracking-wide ${
                isDarkMode 
                  ? 'text-white/80 hover:text-white' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Soluções
            </button>
            <button 
              onClick={() => scrollToSection('precos')}
              className={`transition-all duration-300 font-light text-lg tracking-wide ${
                isDarkMode 
                  ? 'text-white/80 hover:text-white' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Investimento
            </button>
            <button 
              onClick={() => scrollToSection('recursos')}
              className={`transition-all duration-300 font-light text-lg tracking-wide ${
                isDarkMode 
                  ? 'text-white/80 hover:text-white' 
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Recursos
            </button>
            
            {/* Dropdown Mais */}
            <div className="relative">
              <button 
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`transition-all duration-300 font-light text-lg tracking-wide flex items-center ${
                  isDarkMode 
                    ? 'text-white/80 hover:text-white' 
                    : 'text-gray-700 hover:text-gray-900'
                }`}
                aria-controls="dropdown-menu"
                aria-expanded={isMoreMenuOpen}
              >
                Mais
                <svg className="w-4 h-4 ml-1 transition-transform duration-200" style={{ transform: isMoreMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu - Always rendered with the same structure */}
              <div className={`absolute top-full left-0 mt-2 w-48 backdrop-blur-xl border rounded-lg shadow-xl z-50 transition-opacity duration-200 ${
                isDarkMode 
                  ? 'bg-black/95 border-white/20' 
                  : 'bg-white/95 border-gray-300'
              }`} id="dropdown-menu" style={{ opacity: isMoreMenuOpen ? 1 : 0, visibility: isMoreMenuOpen ? 'visible' : 'hidden' }}>
                <div className="py-2">
                  <a 
                    href="/sobre" 
                    className={`block px-4 py-2 transition-all duration-200 hover:text-[#D1FE6E] ${
                      isDarkMode 
                        ? 'text-white/80 hover:bg-white/5' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    Sobre a Empresa
                  </a>
                  <a 
                    href="/termos" 
                    className={`block px-4 py-2 transition-all duration-200 hover:text-[#D1FE6E] ${
                      isDarkMode 
                        ? 'text-white/80 hover:bg-white/5' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    Termos de Uso
                  </a>
                  <a 
                    href="/politicas-privacidade" 
                    className={`block px-4 py-2 transition-all duration-200 hover:text-[#D1FE6E] ${
                      isDarkMode 
                        ? 'text-white/80 hover:bg-white/5' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMoreMenuOpen(false)}
                  >
                    Políticas de Privacidade
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
              aria-label="Alternar tema"
            >
              {isDarkMode ? (
                // Ícone do sol (modo claro)
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                // Ícone da lua (modo escuro)
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            
            <button 
              onClick={() => router.push('/fale-conosco')}
              className="px-8 py-3 text-black bg-[#D1FE6E] rounded-full font-medium hover:bg-[#B8E55A] transition-all duration-300 transform hover:scale-105"
            >
              {LANDING_TRIAL.shortLabel}
            </button>
            <button 
              onClick={() => router.push('/login')}
              className={`px-8 py-3 border rounded-full font-medium transition-all duration-300 ${
                isDarkMode 
                  ? 'text-white border-white/20 hover:bg-white/10' 
                  : 'text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Login
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className={`md:hidden p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'text-white hover:bg-white/10' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className={`md:hidden mt-4 backdrop-blur-xl rounded-xl p-6 border transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-black/90 border-white/20' 
              : 'bg-white/90 border-gray-300'
          }`}>
            <div className="flex flex-col space-y-4">
              <button 
                onClick={() => scrollToSection('solucoes')}
                className={`transition-colors duration-300 font-medium text-left hover:text-[#D1FE6E] ${
                  isDarkMode 
                    ? 'text-white' 
                    : 'text-gray-700'
                }`}
              >
                Soluções
              </button>
              <button 
                onClick={() => scrollToSection('precos')}
                className={`transition-colors duration-300 font-medium text-left hover:text-[#D1FE6E] ${
                  isDarkMode 
                    ? 'text-white' 
                    : 'text-gray-700'
                }`}
              >
                Preços
              </button>
              <button 
                onClick={() => scrollToSection('recursos')}
                className={`transition-colors duration-300 font-medium text-left hover:text-[#D1FE6E] ${
                  isDarkMode 
                    ? 'text-white' 
                    : 'text-gray-700'
                }`}
              >
                Recursos
              </button>
              
              {/* Páginas Legais no Mobile */}
              <div className="pt-4 border-t border-[#D1FE6E]/20">
                <p className={`text-sm font-medium mb-3 ${
                  isDarkMode ? 'text-white/60' : 'text-gray-600'
                }`}>Informações</p>
                <a 
                  href="/sobre" 
                  className={`block transition-colors duration-300 font-medium text-left py-2 hover:text-[#D1FE6E] ${
                    isDarkMode 
                      ? 'text-white' 
                      : 'text-gray-700'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sobre a Empresa
                </a>
                <a 
                  href="/termos" 
                  className={`block transition-colors duration-300 font-medium text-left py-2 hover:text-[#D1FE6E] ${
                    isDarkMode 
                      ? 'text-white' 
                      : 'text-gray-700'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Termos de Uso
                </a>
                <a 
                  href="/politicas-privacidade" 
                  className={`block transition-colors duration-300 font-medium text-left py-2 hover:text-[#D1FE6E] ${
                    isDarkMode 
                      ? 'text-white' 
                      : 'text-gray-700'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Políticas de Privacidade
                </a>
              </div>
              
              <div className="flex flex-col space-y-3 pt-4 border-t border-[#D1FE6E]/20">
                <button 
                  onClick={() => router.push('/fale-conosco')}
                  className="px-6 py-3 text-gray-900 bg-[#D1FE6E] rounded-lg font-semibold hover:bg-[#B8E55A] transition-all duration-300"
                >
                  {LANDING_TRIAL.shortLabel}
                </button>
                <button 
                  onClick={() => router.push('/login')}
                  className={`px-6 py-3 border rounded-lg font-semibold transition-all duration-300 ${
                    isDarkMode 
                      ? 'text-white bg-black border-white/20 hover:bg-white/10' 
                      : 'text-gray-900 bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Login
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section - sem animação pesada */}
      <div 
        className="relative z-10 pt-12 sm:pt-16 md:pt-20 lg:pt-24 pb-6 sm:pb-8 lg:pb-10" 
        style={{ overflow: 'visible' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="relative w-full">
            {/* Glow de fundo - leve e performático */}
            <div 
              className="absolute inset-0 blur-3xl opacity-20 pointer-events-none -z-10"
              style={{
                background: isDarkMode
                  ? 'radial-gradient(circle at 30% 50%, rgba(209, 254, 110, 0.25) 0%, rgba(209, 254, 110, 0.08) 40%, transparent 70%)'
                  : 'radial-gradient(circle at 30% 50%, rgba(209, 254, 110, 0.2) 0%, rgba(184, 229, 90, 0.06) 40%, transparent 70%)'
              }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-8 lg:gap-10 xl:gap-12 items-center lg:items-start">
              {/* Esquerda — mockups celular1, celular2 e celular3 */}
              <div
                data-reveal="hero-phones"
                className={`relative order-1 w-full overflow-visible scroll-reveal-slide-up ${
                  isAnimated('hero-phones') ? 'animated' : ''
                }`}
              >
                <div className="relative w-full pt-4 pb-2 px-3 sm:px-4 lg:px-2 xl:px-4 overflow-visible">
                  <div className="relative flex items-center justify-center w-full overflow-visible">
                    <div className="hero-phone-float-delay-1 relative w-[38%] sm:w-[39%] lg:w-[40%] shrink-0 -rotate-3 opacity-90 z-[1]">
                      <div className="hero-phone-float-inner">
                        <div
                          className="relative"
                          style={{
                            filter: isDarkMode
                              ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.45)) drop-shadow(0 0 24px rgba(209, 254, 110, 0.12))'
                              : 'drop-shadow(0 20px 40px rgba(0,0,0,0.15)) drop-shadow(0 0 20px rgba(209, 254, 110, 0.2))',
                          }}
                        >
                          <Image
                            src="/assets/imagens/celular1.png"
                            alt="App Consert — visão do técnico"
                            width={1030}
                            height={2021}
                            className="w-full h-auto"
                            priority
                            sizes="(max-width: 1024px) 39vw, 340px"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="hero-phone-float-delay-2 relative w-[50%] sm:w-[51%] lg:w-[52%] shrink-0 -ml-[12%] sm:-ml-[13%] z-10">
                      <div className="hero-phone-float-inner">
                        <div
                          className="relative"
                          style={{
                            filter: isDarkMode
                              ? 'drop-shadow(0 25px 50px rgba(0,0,0,0.55)) drop-shadow(0 0 32px rgba(209, 254, 110, 0.18))'
                              : 'drop-shadow(0 25px 50px rgba(0,0,0,0.2)) drop-shadow(0 0 28px rgba(209, 254, 110, 0.25))',
                          }}
                        >
                          <Image
                            src="/assets/imagens/celular2.png"
                            alt="App Consert — tela principal"
                            width={865}
                            height={1696}
                            className="w-full h-auto"
                            priority
                            sizes="(max-width: 1024px) 51vw, 420px"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="hero-phone-float-delay-3 relative w-[38%] sm:w-[39%] lg:w-[40%] shrink-0 rotate-3 -ml-[12%] sm:-ml-[13%] opacity-90 z-[1]">
                      <div className="hero-phone-float-inner">
                        <div
                          className="relative"
                          style={{
                            filter: isDarkMode
                              ? 'drop-shadow(0 20px 40px rgba(0,0,0,0.45)) drop-shadow(0 0 24px rgba(209, 254, 110, 0.12))'
                              : 'drop-shadow(0 20px 40px rgba(0,0,0,0.15)) drop-shadow(0 0 20px rgba(209, 254, 110, 0.2))',
                          }}
                        >
                          <Image
                            src="/assets/imagens/celular3.png"
                            alt="App Consert — tela do aplicativo"
                            width={1030}
                            height={2021}
                            className="w-full h-auto"
                            priority
                            sizes="(max-width: 1024px) 39vw, 340px"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="absolute inset-x-0 bottom-0 h-12 sm:h-16 pointer-events-none z-20"
                    style={{
                      background: isDarkMode
                        ? 'linear-gradient(to top, rgb(0 0 0) 0%, rgb(0 0 0 / 80%) 40%, transparent 100%)'
                        : 'linear-gradient(to top, rgb(255 255 255) 0%, rgb(255 255 255 / 85%) 40%, transparent 100%)',
                    }}
                  />
                </div>
              </div>

              {/* Direita — texto */}
              <div className="order-2 relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left gap-6 md:gap-7 animate-fade-in lg:pt-10 xl:pt-14">
                <div 
                  data-reveal="badge"
                  className={`inline-flex items-center px-5 py-2.5 backdrop-blur-xl border rounded-full ${
                    isDarkMode 
                      ? 'bg-white/[0.06] border-white/15' 
                      : 'bg-white/90 border-gray-300 shadow-lg'
                  }`}
                >
                  <div className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-2.5 animate-pulse" />
                  <span className={`text-xs sm:text-sm font-medium tracking-wide uppercase ${
                    isDarkMode ? 'text-white/75' : 'text-gray-600'
                  }`}>
                    App exclusivo · {LANDING_TRIAL.label}
                  </span>
                </div>

                <div data-reveal="headline" className="space-y-3">
                  <h1 
                    className={`text-3xl sm:text-4xl md:text-[2.75rem] lg:text-5xl xl:text-[3.25rem] font-light leading-[1.1] tracking-tight ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    <span className="block">A assistência técnica</span>
                    <span className={`block mt-1 font-normal ${isDarkMode ? 'text-gradient-accent' : 'text-gradient-secondary'}`}>
                      que cabe no bolso.
                    </span>
                  </h1>
                  <p 
                    className={`text-base sm:text-lg md:text-xl font-light leading-snug max-w-lg ${
                      isDarkMode ? 'text-white/60' : 'text-gray-500'
                    }`}
                  >
                    O primeiro e único sistema com aplicativo dedicado
                    para técnicos.
                  </p>
                </div>

                <p 
                  data-reveal="subheadline"
                  className={`text-sm sm:text-base max-w-md leading-relaxed ${
                    isDarkMode ? 'text-white/50' : 'text-gray-500'
                  }`}
                >
                  Ordens de serviço, equipe e financeiro em tempo real —
                  sem depender do computador.
                </p>

                <div data-reveal="cta" className="flex flex-col items-center lg:items-start gap-3 pt-1">
                  <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                  <button 
                    onClick={() => router.push('/fale-conosco')}
                    className={`px-6 py-3 rounded-full font-medium text-sm sm:text-base transition-all duration-300 ${
                      isDarkMode
                        ? 'bg-[#D1FE6E] text-black hover:bg-[#B8E55A] hover:shadow-lg hover:shadow-[#D1FE6E]/50'
                        : 'bg-[#D1FE6E] text-black hover:bg-[#B8E55A] hover:shadow-lg'
                    }`}
                    style={{
                      boxShadow: isDarkMode 
                        ? '0 4px 20px rgba(209, 254, 110, 0.4)' 
                        : '0 4px 20px rgba(209, 254, 110, 0.5)'
                    }}
                  >
                    {LANDING_TRIAL.shortLabel}
                  </button>
                  <button 
                    onClick={() => scrollToSection('recursos')}
                    className={`px-6 py-3 rounded-full font-medium text-sm sm:text-base transition-all duration-300 border backdrop-blur-sm ${
                      isDarkMode 
                        ? 'border-white/30 text-white bg-black/40 hover:bg-black/60 hover:border-white/50'
                        : 'border-gray-300 text-gray-700 bg-white/90 hover:bg-gray-50'
                    }`}
                  >
                    Ver Funcionalidades
                  </button>
                  </div>
                  <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-white/45' : 'text-gray-500'}`}>
                    {LANDING_TRIAL.description} {LANDING_TRIAL.note}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="recursos" className="relative z-10 pt-4 pb-12 md:pt-6 md:pb-16 overflow-hidden">
        <div
          className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8 lg:px-12"
          ref={(el) => {
            if (el) {
              const style = getSectionTransform(el);
              Object.assign(el.style, style);
            }
          }}
        >
          <div
            data-reveal="features-header"
            className={`text-center mb-8 md:mb-10 hero-reveal ${
              isAnimated('features-header') ? 'revealed' : ''
            }`}
          >
            <h2 className={`text-5xl sm:text-6xl md:text-7xl font-light mb-6 md:mb-8 leading-none tracking-tight ${
              isDarkMode ? 'text-gradient-accent' : 'text-gray-800'
            }`}>
              Tudo que sua assistência precisa
            </h2>
            <p className={`text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-light ${
              isDarkMode ? 'text-white/60' : 'text-gray-600'
            }`}>
              Ferramentas essenciais para modernizar sua operação — do app do técnico ao financeiro completo.
            </p>
          </div>
        </div>

        <div
          data-reveal="features-carousel"
          className={`hero-reveal ${isAnimated('features-carousel') ? 'revealed' : ''}`}
        >
          <FeaturesCarousel isDarkMode={isDarkMode} />
        </div>
      </div>

      <AppShowcase isDarkMode={isDarkMode} />

      {/* Sistema — slide infinito */}
      <section id="solucoes" className="relative z-10 pt-8 sm:pt-10 md:pt-12 pb-16 md:pb-24 overflow-hidden">
        <div
          className="relative mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-12"
          ref={(el) => {
            if (el) {
              const style = getSectionTransform(el);
              Object.assign(el.style, style);
            }
          }}
        >
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] blur-3xl opacity-20 pointer-events-none -z-10"
            style={{
              background: isDarkMode
                ? 'radial-gradient(ellipse, rgba(209, 254, 110, 0.15) 0%, transparent 70%)'
                : 'radial-gradient(ellipse, rgba(209, 254, 110, 0.12) 0%, transparent 70%)',
            }}
          />

          <div
            data-reveal="tabs-header"
            className={`text-center mb-8 md:mb-10 scroll-reveal-slide-up ${
              isAnimated('tabs-header') ? 'animated' : ''
            }`}
          >
            <h2
              className={`text-3xl sm:text-4xl md:text-5xl font-light leading-tight tracking-tight ${
                isDarkMode ? 'text-gradient-accent' : 'text-gray-900'
              }`}
            >
              Veja o sistema em ação
            </h2>
            <p className={`mt-4 text-base md:text-lg font-light max-w-xl mx-auto ${
              isDarkMode ? 'text-white/50' : 'text-gray-500'
            }`}>
              Telas reais do Consert — passe o mouse para pausar
            </p>
          </div>
        </div>

        <div
          data-reveal="system-slider"
          className={`scroll-reveal-slide-up ${isAnimated('system-slider') ? 'animated' : ''}`}
        >
          <SystemShowcaseSlider isDarkMode={isDarkMode} />
        </div>
      </section>

      {/* Pricing Section */}
      <div id="precos" className="relative z-10 px-4 sm:px-6 md:px-8 pt-12 md:pt-16 pb-6 md:pb-8 lg:px-12">
        <div 
          className="mx-auto max-w-7xl"
          ref={(el) => {
            if (el) {
              const style = getSectionTransform(el);
              Object.assign(el.style, style);
            }
          }}
        >
          {/* Section Header */}
          <div 
            data-reveal="pricing-header"
            className={`text-center mb-12 md:mb-16 hero-reveal ${
              isAnimated('pricing-header') ? 'revealed' : ''
            }`}
          >
            <h2 className={`text-5xl sm:text-6xl md:text-7xl font-light mb-6 md:mb-8 leading-none tracking-tight ${
              isDarkMode ? 'text-gradient-accent' : 'text-gray-800'
            }`}>
              Nossos valores
            </h2>
            <p className={`text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-light ${
              isDarkMode ? 'text-white/60' : 'text-gray-600'
            }`}>
              Comece com {LANDING_TRIAL.label.toLowerCase()} — plano completo com {SYSTEM_FEATURES.length}+ funcionalidades
            </p>
          </div>

          <div
            data-reveal="pricing-basic"
            className={`card-reveal ${isAnimated('pricing-basic') ? 'revealed' : ''}`}
          >
            <PricingSection
              isDarkMode={isDarkMode}
              features={SYSTEM_FEATURES}
              onContact={handleContatoEquipe}
            />
          </div>

          {/* Additional Info */}
          <div 
            data-reveal="pricing-info"
            className={`text-center mt-6 md:mt-8 scroll-reveal-fade scroll-reveal-delay-300 ${
              isAnimated('pricing-info') ? 'revealed' : ''
            }`}
          >
            <p className={`text-sm max-w-2xl mx-auto ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
              {LANDING_TRIAL.label} para experimentar. Suporte por email e chat. Cancelamento a qualquer momento.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 px-4 sm:px-6 md:px-8 pt-4 pb-16 md:pt-6 md:pb-20 lg:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <div className={`backdrop-blur-sm rounded-3xl p-8 sm:p-10 md:p-12 border ${
            isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200 shadow-lg'
          }`}>
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-6 ${
              isDarkMode ? 'border-[#D1FE6E]/25 bg-[#D1FE6E]/10' : 'border-[#B8E55A]/40 bg-[#D1FE6E]/15'
            }`}>
              <span className={`text-xs font-medium tracking-wide uppercase ${isDarkMode ? 'text-[#D1FE6E]' : 'text-gray-700'}`}>
                {LANDING_TRIAL.label}
              </span>
            </div>
            <h2 className={`text-4xl sm:text-5xl md:text-6xl font-light mb-6 leading-none tracking-tight ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Pronto para transformar sua assistência?
            </h2>
            <p className={`text-lg md:text-xl mb-10 leading-relaxed font-light max-w-2xl mx-auto ${
              isDarkMode ? 'text-white/65' : 'text-gray-600'
            }`}>
              Junte-se a centenas de assistências que já confiam no Gestão Consert.
              {` ${LANDING_TRIAL.description}`}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={() => router.push('/fale-conosco')}
                className="px-10 py-4 bg-[#D1FE6E] text-black rounded-full font-medium text-base sm:text-lg hover:bg-[#B8E55A] transition-all duration-300 transform hover:scale-105"
              >
                {LANDING_TRIAL.shortLabel}
              </button>
              <button 
                onClick={() => router.push('/login')}
                className={`px-12 py-5 border rounded-full font-medium text-lg transition-all duration-300 ${
                  isDarkMode 
                    ? 'text-white border-white/30 hover:bg-white/10' 
                    : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Ver Demonstração
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Novo Design */}
      <footer className={`relative z-10 px-8 py-16 lg:px-12 border-t backdrop-blur-sm ${
        isDarkMode ? 'border-white/10 bg-gradient-to-b from-transparent to-black/30' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="mx-auto max-w-7xl">
          {/* Grid de 4 colunas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Coluna 1 - Logo e Descrição */}
            <div className="flex flex-col items-center md:items-start">
              <Image 
                src={isDarkMode ? "/assets/imagens/logobranco.png" : "/assets/imagens/logopreto.png"} 
                alt="Gestão Consert Logo" 
                width={180} 
                height={180}
                className="transition-all duration-500 ease-out hover:scale-105 hover:brightness-110 mb-6"
              />
              <p className={`text-sm leading-relaxed mt-4 max-w-xs ${isDarkMode ? 'text-white/60' : 'text-gray-600'}`}>
                Sistema completo para gestão de assistências técnicas. Simplifique processos, aumente a produtividade e encante seus clientes.
              </p>
              
              {/* Redes Sociais */}
              <div className="flex space-x-4 mt-6">
                <a href="#" className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#D1FE6E] hover:text-black transition-all duration-300 ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#D1FE6E] hover:text-black transition-all duration-300 ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#D1FE6E] hover:text-black transition-all duration-300 ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="#" className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#D1FE6E] hover:text-black transition-all duration-300 ${isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Coluna 2 - Links Rápidos */}
            <div>
              <h3 className={`font-medium text-lg mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Links Rápidos</h3>
              <ul className="space-y-4">
                <li>
                  <Link href="#recursos" className={`hover:text-[#B8E55A] transition-colors duration-300 flex items-center ${
                    isDarkMode ? 'text-white/70' : 'text-gray-600'
                  }`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    Recursos
                  </Link>
                </li>
                <li>
                  <Link href="#planos" className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} hover:text-[#B8E55A] transition-colors duration-300 flex items-center`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    Planos e Preços
                  </Link>
                </li>
                <li>
                  <Link href="#depoimentos" className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} hover:text-[#B8E55A] transition-colors duration-300 flex items-center`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    Depoimentos
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} hover:text-[#B8E55A] transition-colors duration-300 flex items-center`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    Perguntas Frequentes
                  </Link>
                </li>
                <li>
                  <Link href="#blog" className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} hover:text-[#B8E55A] transition-colors duration-300 flex items-center`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Coluna 3 - Legal */}
            <div>
              <h3 className={`font-medium text-lg mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Legal</h3>
              <ul className="space-y-4">
                <li>
                  <Link href="/termos" className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} hover:text-[#B8E55A] transition-colors duration-300 flex items-center`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    Termos de Serviço
                  </Link>
                </li>
                <li>
                  <Link href="/politicas-privacidade" className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} hover:text-[#B8E55A] transition-colors duration-300 flex items-center`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    Política de Privacidade
                  </Link>
                </li>
                <li>
                  <Link href="/sobre" className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} hover:text-[#B8E55A] transition-colors duration-300 flex items-center`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    Sobre a Empresa
                  </Link>
                </li>
                <li>
                  <Link href="#cookies" className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} hover:text-[#B8E55A] transition-colors duration-300 flex items-center`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    Política de Cookies
                  </Link>
                </li>
                <li>
                  <Link href="#lgpd" className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} hover:text-[#B8E55A] transition-colors duration-300 flex items-center`}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    LGPD
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Coluna 4 - Contato */}
            <div>
              <h3 className={`font-medium text-lg mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Contato</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-[#B8E55A] mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href="tel:+5512988353971" className={`hover:text-[#B8E55A] transition-colors ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                    (12) 98835-3971
                  </a>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-[#B8E55A] mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:suporte@gestaoconsert.com.br" className={`hover:text-[#B8E55A] transition-colors ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                    suporte@gestaoconsert.com.br
                  </a>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-[#B8E55A] mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className={isDarkMode ? 'text-white/70' : 'text-gray-600'}>
                    Av. Princesa Isabel, 1417 — Loja 4<br />
                    Ilhabela, SP
                  </span>
                </li>
              </ul>
              
              {/* Newsletter */}
              <div className="mt-8">
                <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Assine nossa newsletter</h4>
                <div className="flex">
                  <input 
                    type="email" 
                    placeholder="Seu e-mail" 
                    className={`border rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#D1FE6E]/50 w-full ${
                      isDarkMode 
                        ? 'bg-white/5 border-white/10 text-white placeholder-white/40' 
                        : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <button className="bg-[#D1FE6E] text-black px-4 rounded-r-md hover:bg-[#B8E55A] transition-colors duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Linha divisória */}
          <div className={`border-t pt-8 pb-4 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className={`text-sm font-light mb-4 md:mb-0 ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
                 © 2026 Gestão Consert. Todos os direitos reservados.
               </p>
              
              <div className="flex items-center space-x-6">
                <Link href="/termos" className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Termos</Link>
                <Link href="/politicas-privacidade" className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Privacidade</Link>
                <Link href="/sobre" className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Sobre</Link>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-gray-500'}`}>
                 <span className="text-[#B8E55A]">Gestão Consert</span> — Transformando assistências técnicas em negócios de sucesso desde 2022.
               </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}