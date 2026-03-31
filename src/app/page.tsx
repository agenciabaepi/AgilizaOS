'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useAppleParallax } from '@/hooks/useParallax';
import { useValorAssinatura } from '@/hooks/useValorAssinatura';
import dashboardImage from '@/assets/imagens/dashboard.png';
import caixaImage from '@/assets/imagens/caixa.png';
import financeiroImage from '@/assets/imagens/financeiro.png';
import produtosImage from '@/assets/imagens/produtos.png';
import contasPagarImage from '@/assets/imagens/contas a pagar.png';

function PrecoAssinatura({ isDarkMode }: { isDarkMode: boolean }) {
  const { valor } = useValorAssinatura();
  return (
    <div className="mb-8">
      <div className="flex items-baseline">
        <span className={`text-3xl md:text-4xl font-light ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          R$ {valor.toFixed(2).replace('.', ',')}
        </span>
        <span className={`text-sm ml-2 ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>/mês</span>
      </div>
    </div>
  );
}

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
  
  // Sistema de abas state
  const [activeTab, setActiveTab] = useState('dashboard');

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
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
              onClick={() => router.push('/cadastro')}
              className="px-8 py-3 text-black bg-[#D1FE6E] rounded-full font-medium hover:bg-[#B8E55A] transition-all duration-300 transform hover:scale-105"
            >
              Começar Agora
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
                  onClick={() => router.push('/cadastro')}
                  className="px-6 py-3 text-gray-900 bg-[#D1FE6E] rounded-lg font-semibold hover:bg-[#B8E55A] transition-all duration-300"
                >
                  Começar Agora
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
        className="relative z-10 py-12 sm:py-16 md:py-24 lg:py-32" 
        style={{ overflow: 'visible' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="relative w-full min-h-[50vh] flex flex-col items-center justify-center text-center">
            {/* Glow de fundo - leve e performático */}
            <div 
              className="absolute inset-0 blur-3xl opacity-20 pointer-events-none -z-10"
              style={{
                background: isDarkMode
                  ? 'radial-gradient(circle at 50% 40%, rgba(209, 254, 110, 0.25) 0%, rgba(209, 254, 110, 0.08) 40%, transparent 70%)'
                  : 'radial-gradient(circle at 50% 40%, rgba(209, 254, 110, 0.2) 0%, rgba(184, 229, 90, 0.06) 40%, transparent 70%)'
              }}
            />

            <div className="w-full max-w-4xl flex flex-col items-center gap-5 md:gap-6 animate-fade-in">
              {/* Social Proof Badge */}
              <div 
                data-reveal="badge"
                className={`inline-flex items-center px-6 py-3 backdrop-blur-xl border rounded-full ${
                  isDarkMode 
                    ? 'bg-black/40 border-white/20' 
                    : 'bg-white/90 border-gray-300 shadow-lg'
                }`}
                style={{
                  boxShadow: isDarkMode 
                    ? '0 8px 32px rgba(209, 254, 110, 0.1)' 
                    : '0 8px 32px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1)'
                }}
              >
                <div className="w-2.5 h-2.5 bg-[#D1FE6E] rounded-full mr-3 animate-pulse" />
                <span className={`text-xs sm:text-sm font-light tracking-wide ${
                  isDarkMode ? 'text-white/90' : 'text-gray-700'
                }`}>
                  +500 assistências confiam no Consert
                </span>
              </div>

              {/* Main Headline */}
              <div data-reveal="headline">
                <h1 
                  className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light mb-2 md:mb-3 leading-tight tracking-tight ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}
                  style={{
                    textShadow: isDarkMode ? '0 0 30px rgba(209, 254, 110, 0.4), 0 0 60px rgba(209, 254, 110, 0.2)' : 'none'
                  }}
                >
                  Sua assistência digital começa aqui
                </h1>
                <p 
                  className={`block font-medium mt-1 text-lg sm:text-xl md:text-2xl ${
                    isDarkMode ? 'text-white/90' : 'text-gray-700'
                  }`}
                  style={{ textShadow: isDarkMode ? '0 0 15px rgba(209, 254, 110, 0.3)' : 'none' }}
                >
                  simples de usar
                </p>
              </div>

              {/* Sub-headline */}
              <p 
                data-reveal="subheadline"
                className={`text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-light ${
                  isDarkMode ? 'text-white/70' : 'text-gray-600'
                }`}
                style={{ textShadow: isDarkMode ? '0 2px 10px rgba(0, 0, 0, 0.5)' : 'none' }}
              >
                Ferramentas inteligentes que fazem o trabalho pesado — para que você não precise.
                Transforme seu fluxo de trabalho com automação inteligente.
              </p>

              {/* CTA Buttons */}
              <div data-reveal="cta" className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => router.push('/cadastro')}
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
                  Começar Agora
                </button>
                <button 
                  onClick={() => scrollToSection('solucoes')}
                  className={`px-6 py-3 rounded-full font-medium text-sm sm:text-base transition-all duration-300 border backdrop-blur-sm ${
                    isDarkMode 
                      ? 'border-white/30 text-white bg-black/40 hover:bg-black/60 hover:border-white/50'
                      : 'border-gray-300 text-gray-700 bg-white/90 hover:bg-gray-50'
                  }`}
                >
                  Ver Funcionalidades
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sistema de Abas - Visualizações do Sistema */}
      <section id="solucoes" className="relative z-10 px-4 sm:px-6 md:px-8 py-4 md:py-8 lg:px-12">
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
            data-reveal="tabs-header"
            className={`text-center mb-16 scroll-reveal-slide-up ${
              isAnimated('tabs-header') ? 'animated' : ''
            }`}
          >
            <h2 className={`text-4xl md:text-5xl lg:text-6xl font-light mb-8 leading-tight tracking-tight ${
              isDarkMode ? 'text-gradient-accent' : 'text-gray-800'
            }`}>
              Veja o sistema em ação
            </h2>
            <p className={`text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-light ${
              isDarkMode ? 'text-white/70' : 'text-gray-600'
            }`}>
              Explore as diferentes funcionalidades e visualize como o Consert pode transformar sua assistência
            </p>
          </div>

          {/* Sistema de Abas */}
          <div className={`bg-transparent rounded-3xl border p-8 md:p-12 ${isDarkMode ? 'border-white/20' : 'border-gray-300'}`}>
            {/* Navegação das Abas */}
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                { id: 'caixa', label: 'Caixa', icon: '💰' },
                { id: 'contas', label: 'Contas a Pagar', icon: '📄' },
                { id: 'financeiro', label: 'Financeiro', icon: '💹' },
                { id: 'produtos', label: 'Produtos', icon: '📦' },
                { id: 'mais', label: 'Muito mais', icon: '⚡' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-5 py-2.5 md:px-6 md:py-3 rounded-full font-medium transition-all duration-300 text-sm md:text-base ${
                    activeTab === tab.id
                      ? 'bg-[#D1FE6E] text-black shadow-lg shadow-[#D1FE6E]/30 transform scale-105'
                      : isDarkMode 
                        ? 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white border border-white/10'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 border border-gray-300'
                  }`}
                >
                  <span className="mr-2 text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Conteúdo das Abas */}
            <div className="relative">
              {/* Dashboard Tab */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className={`text-2xl md:text-3xl font-light mb-4 ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      Dashboard BI (em tempo real)
                    </h3>
                    <div className={`flex flex-wrap justify-center gap-4 text-sm mb-8 ${
                      isDarkMode ? 'text-white/70' : 'text-gray-600'
                    }`}>
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-2"></span>
                        Indicadores (KPIs)
                      </span>
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-2"></span>
                        Gráficos interativos
                      </span>
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-2"></span>
                        Relatórios simplificados
                      </span>
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-[#D1FE6E] rounded-full mr-2"></span>
                        Tudo em tempo real
                      </span>
                    </div>
                  </div>
                  
                  {/* Imagem do Dashboard */}
                  <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-3 md:p-6 shadow-2xl shadow-black/20 border border-gray-200/50 overflow-hidden group hover:shadow-3xl transition-shadow duration-300">
                    <div className="relative w-full h-auto rounded-xl overflow-hidden">
                      <Image 
                        src={dashboardImage}
                        alt="Dashboard do sistema Consert"
                        className="w-full h-auto rounded-xl transition-transform duration-500 group-hover:scale-[1.01]"
                        quality={95}
                        priority={activeTab === 'dashboard'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Caixa Tab */}
              {activeTab === 'caixa' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className={`text-2xl md:text-3xl font-light mb-4 ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      Gestão de Caixa Completa
                    </h3>
                    <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                      Controle total do fluxo de caixa, vendas e movimentações financeiras
                    </p>
                  </div>
                  
                  <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-3 md:p-6 shadow-2xl shadow-black/20 border border-gray-200/50 overflow-hidden group hover:shadow-3xl transition-shadow duration-300">
                    <div className="relative w-full h-auto rounded-xl overflow-hidden">
                      <Image 
                        src={caixaImage}
                        alt="Sistema de Caixa"
                        className="w-full h-auto rounded-xl transition-transform duration-500 group-hover:scale-[1.01]"
                        quality={95}
                        priority={activeTab === 'caixa'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contas a Pagar Tab */}
              {activeTab === 'contas' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className={`text-2xl md:text-3xl font-light mb-4 ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      Contas a Pagar
                    </h3>
                    <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                      Gerencie todas as contas da empresa com controle total de pagamentos e vencimentos
                    </p>
                  </div>
                  
                  <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-3 md:p-6 shadow-2xl shadow-black/20 border border-gray-200/50 overflow-hidden group hover:shadow-3xl transition-shadow duration-300">
                    <div className="relative w-full h-auto rounded-xl overflow-hidden">
                      <Image 
                        src={contasPagarImage}
                        alt="Contas a Pagar"
                        className="w-full h-auto rounded-xl transition-transform duration-500 group-hover:scale-[1.01]"
                        quality={95}
                        priority={activeTab === 'contas'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Financeiro Tab */}
              {activeTab === 'financeiro' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className={`text-2xl md:text-3xl font-light mb-4 ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      Análise Financeira e Lucro
                    </h3>
                    <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                      Visualize lucros, despesas e desempenho financeiro com gráficos e métricas em tempo real
                    </p>
                  </div>
                  
                  <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-3 md:p-6 shadow-2xl shadow-black/20 border border-gray-200/50 overflow-hidden group hover:shadow-3xl transition-shadow duration-300">
                    <div className="relative w-full h-auto rounded-xl overflow-hidden">
                      <Image 
                        src={financeiroImage}
                        alt="Módulo Financeiro"
                        className="w-full h-auto rounded-xl transition-transform duration-500 group-hover:scale-[1.01]"
                        quality={95}
                        priority={activeTab === 'financeiro'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Produtos Tab */}
              {activeTab === 'produtos' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className={`text-2xl md:text-3xl font-light mb-4 ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      Gestão de Produtos
                    </h3>
                    <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                      Cadastre e gerencie produtos, serviços e estoque de forma organizada
                    </p>
                  </div>
                  
                  <div className="relative bg-gradient-to-br from-gray-50 to-white rounded-2xl p-3 md:p-6 shadow-2xl shadow-black/20 border border-gray-200/50 overflow-hidden group hover:shadow-3xl transition-shadow duration-300">
                    <div className="relative w-full h-auto rounded-xl overflow-hidden">
                      <Image 
                        src={produtosImage}
                        alt="Gestão de Produtos"
                        className="w-full h-auto rounded-xl transition-transform duration-500 group-hover:scale-[1.01]"
                        quality={95}
                        priority={activeTab === 'produtos'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none"></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mais Funcionalidades Tab */}
              {activeTab === 'mais' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className={`text-2xl md:text-3xl font-light mb-4 ${
                      isDarkMode ? 'text-white' : 'text-gray-800'
                    }`}>
                      Muito Mais Funcionalidades
                    </h3>
                    <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                      Sistema completo com recursos avançados para sua assistência
                    </p>
                  </div>
                  
                  <div className="relative bg-white rounded-2xl p-8 shadow-2xl border border-gray-200">
                    <div className="h-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-4xl">⚡</span>
                        </div>
                        <h4 className="text-gray-700 text-xl font-medium mb-2">Recursos Avançados</h4>
                        <p className="text-gray-500">Mais funcionalidades em desenvolvimento</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <div id="recursos" className="relative z-10 px-4 sm:px-6 md:px-8 py-12 md:py-20 lg:px-12">
        <div 
          className="mx-auto max-w-6xl"
          ref={(el) => {
            if (el) {
              const style = getSectionTransform(el);
              Object.assign(el.style, style);
            }
          }}
        >
          <div 
            data-reveal="features-header"
            className={`text-center mb-12 md:mb-16 hero-reveal ${
              isAnimated('features-header') ? 'revealed' : ''
            }`}
          >
            <h2 className={`text-6xl md:text-7xl font-light mb-12 leading-none tracking-tight ${
              isDarkMode ? 'text-gradient-accent' : 'text-gray-800'
            }`}>
              Tudo que sua assistência precisa
            </h2>
            <p className={`text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed font-light ${
              isDarkMode ? 'text-white/70' : 'text-gray-600'
            }`}>
              Uma plataforma completa com todas as ferramentas essenciais para modernizar sua assistência
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Feature 1 */}
            <div 
              data-reveal="feature-1"
              className={`group h-full card-reveal ${
                isAnimated('feature-1') ? 'revealed' : ''
              }`}
            >
              <div 
                className={`h-full rounded-3xl p-6 md:p-8 border transition-all duration-500 ease-out hover:transform hover:scale-105 group-hover:shadow-2xl flex flex-col ${
                  isDarkMode ? '' : 'bg-gray-50/90 border-gray-200 shadow-lg'
                }`}
                style={isDarkMode ? {
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                } : undefined}
              >
                <div 
                  className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-4 md:mb-6 shadow-2xl transition-all duration-500 group-hover:scale-110"
                  style={{
                    boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)'
                  }}
                >
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className={`font-light text-lg md:text-xl mb-3 md:mb-4 tracking-wide ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ordens de Serviço</h3>
                <p className={`leading-relaxed text-sm md:text-base font-light flex-grow ${isDarkMode ? 'text-white/80' : 'text-gray-600'}`}>
                  Crie e gerencie ordens de serviço de forma simples e organizada. 
                  Acompanhe o progresso em tempo real.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div 
              data-reveal="feature-2"
              className={`group h-full card-reveal scroll-reveal-delay-100 ${
                isAnimated('feature-2') ? 'revealed' : ''
              }`}
            >
              <div 
                className={`h-full rounded-3xl p-8 border transition-all duration-500 ease-out hover:transform hover:scale-105 group-hover:shadow-2xl flex flex-col ${isDarkMode ? '' : 'bg-gray-50/90 border-gray-200 shadow-lg'}`}
                style={isDarkMode ? {
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                } : undefined}
              >
                <div 
                  className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 group-hover:scale-110"
                  style={{ boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)' }}
                >
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className={`font-light text-xl mb-4 tracking-wide ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Gestão de Clientes</h3>
                <p className={`leading-relaxed text-base font-light flex-grow ${isDarkMode ? 'text-white/80' : 'text-gray-600'}`}>
                  Cadastre e acompanhe seus clientes com histórico completo. 
                  Histórico de serviços e veículos.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div 
              data-reveal="feature-3"
              className={`group h-full card-reveal scroll-reveal-delay-200 ${
                isAnimated('feature-3') ? 'revealed' : ''
              }`}
            >
              <div 
                className={`h-full rounded-3xl p-8 border transition-all duration-500 ease-out hover:transform hover:scale-105 group-hover:shadow-2xl flex flex-col ${isDarkMode ? '' : 'bg-gray-50/90 border-gray-200 shadow-lg'}`}
                style={isDarkMode ? {
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                } : undefined}
              >
                <div 
                  className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 group-hover:scale-110"
                  style={{ boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)' }}
                >
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className={`font-light text-xl mb-4 tracking-wide ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Controle Financeiro</h3>
                <p className={`leading-relaxed text-base font-light flex-grow ${isDarkMode ? 'text-white/80' : 'text-gray-600'}`}>
                  Acompanhe receitas, despesas e lucros em tempo real. 
                  Relatórios financeiros detalhados.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div 
              data-reveal="feature-4"
              className={`group h-full card-reveal scroll-reveal-delay-300 ${
                isAnimated('feature-4') ? 'revealed' : ''
              }`}
            >
              <div 
                className={`h-full rounded-3xl p-8 border transition-all duration-500 ease-out hover:transform hover:scale-105 group-hover:shadow-2xl flex flex-col ${isDarkMode ? '' : 'bg-gray-50/90 border-gray-200 shadow-lg'}`}
                style={isDarkMode ? {
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                } : undefined}
              >
                <div 
                  className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 group-hover:scale-110"
                  style={{ boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)' }}
                >
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className={`font-light text-xl mb-4 tracking-wide ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Relatórios Avançados</h3>
                <p className={`leading-relaxed text-base font-light flex-grow ${isDarkMode ? 'text-white/80' : 'text-gray-600'}`}>
                  Relatórios detalhados para tomar decisões estratégicas. 
                  Dashboards personalizáveis.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div 
              data-reveal="feature-5"
              className={`group h-full card-reveal scroll-reveal-delay-400 ${
                isAnimated('feature-5') ? 'revealed' : ''
              }`}
            >
              <div 
                className={`h-full rounded-3xl p-8 border transition-all duration-500 ease-out hover:transform hover:scale-105 group-hover:shadow-2xl flex flex-col ${isDarkMode ? '' : 'bg-gray-50/90 border-gray-200 shadow-lg'}`}
                style={isDarkMode ? {
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                } : undefined}
              >
                <div 
                  className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 group-hover:scale-110"
                  style={{ boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)' }}
                >
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className={`font-light text-xl mb-4 tracking-wide ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Acesso Mobile</h3>
                <p className={`leading-relaxed text-base font-light flex-grow ${isDarkMode ? 'text-white/80' : 'text-gray-600'}`}>
                  Acesse o sistema de qualquer dispositivo, a qualquer hora. 
                  Interface responsiva e otimizada.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div 
              data-reveal="feature-6"
              className={`group h-full card-reveal scroll-reveal-delay-500 ${
                isAnimated('feature-6') ? 'revealed' : ''
              }`}
            >
              <div 
                className={`h-full rounded-3xl p-8 border transition-all duration-500 ease-out hover:transform hover:scale-105 group-hover:shadow-2xl flex flex-col ${isDarkMode ? '' : 'bg-gray-50/90 border-gray-200 shadow-lg'}`}
                style={isDarkMode ? {
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                } : undefined}
              >
                <div 
                  className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 group-hover:scale-110"
                  style={{ boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)' }}
                >
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className={`font-light text-xl mb-4 tracking-wide ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Segurança Total</h3>
                <p className={`leading-relaxed text-base font-light flex-grow ${isDarkMode ? 'text-white/80' : 'text-gray-600'}`}>
                  Seus dados protegidos com a mais alta segurança. 
                  Backup automático e criptografia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="precos" className="relative z-10 px-4 sm:px-6 md:px-8 py-12 md:py-20 lg:px-12">
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
            <h2 className={`text-6xl md:text-7xl font-light mb-8 leading-none tracking-tight ${
              isDarkMode ? 'text-gradient-accent' : 'text-gray-800'
            }`}>
              Nossos valores
            </h2>
            <p className={`text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed font-light ${
              isDarkMode ? 'text-white/70' : 'text-gray-600'
            }`}>
              Acesso completo ao sistema por um valor único mensal
            </p>
          </div>

          {/* Card único - valor fixo */}
          <div 
            data-reveal="pricing-basic"
            className={`group relative card-reveal max-w-xl mx-auto ${
              isAnimated('pricing-basic') ? 'revealed' : ''
            }`}
          >
            <div 
              className={`rounded-3xl p-6 md:p-8 border transition-all duration-500 ease-out hover:shadow-2xl flex flex-col relative overflow-hidden ${
                isDarkMode ? '' : 'bg-white border-gray-200 shadow-xl'
              }`}
              style={isDarkMode ? {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)'
              } : undefined}
            >
              {/* Ícone */}
              <div className="relative z-10 mb-4 md:mb-6">
                <div 
                  className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-2xl flex items-center justify-center shadow-2xl"
                  style={{ boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)' }}
                >
                  <svg className="w-7 h-7 md:w-8 md:h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>

              <div className="relative z-10 flex-grow">
                <div className="mb-4">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded mb-3 ${
                    isDarkMode ? 'bg-white/5 text-white/80' : 'bg-gray-100 text-gray-700'
                  }`}>
                    Acesso completo ao sistema
                  </span>
                  <p className={`text-sm mb-4 ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>Tudo que sua assistência precisa em uma única assinatura</p>
                </div>

                {/* Preço fixo - valor dinâmico da config */}
                <PrecoAssinatura isDarkMode={isDarkMode} />

                {/* Principais serviços do sistema */}
                <p className={`text-xs font-medium uppercase tracking-wider mb-4 ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>Incluído no sistema</p>
                <div className="space-y-3 mb-8">
                  {[
                    'Ordens de serviço (OS completo)',
                    'Gestão de clientes e histórico',
                    'Caixa e controle financeiro',
                    'Contas a pagar',
                    'Produtos, serviços e catálogo',
                    'Dashboard e relatórios em tempo real',
                    'Acesso mobile e responsivo',
                    'Dados na nuvem com segurança'
                  ].map((item) => (
                    <div key={item} className="flex items-center">
                      <div className="w-5 h-5 bg-[#D1FE6E] rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className={`text-sm ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-auto">
                <button 
                  onClick={() => router.push('/cadastro')}
                  className="w-full py-3 md:py-4 bg-[#D1FE6E] text-black rounded-2xl font-medium hover:bg-[#B8E55A] transition-all duration-300 transform hover:scale-[1.02] text-sm md:text-base"
                  style={{ boxShadow: '0 4px 20px rgba(209, 254, 110, 0.3)' }}
                >
                  Começar agora
                </button>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div 
            data-reveal="pricing-info"
            className={`text-center mt-16 scroll-reveal-fade scroll-reveal-delay-300 ${
              isAnimated('pricing-info') ? 'revealed' : ''
            }`}
          >
            <p className={`text-sm max-w-2xl mx-auto ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
              Suporte por email e chat. Cancelamento a qualquer momento.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 px-8 py-32 lg:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <div className={`backdrop-blur-sm rounded-3xl p-16 border ${
            isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200 shadow-lg'
          }`}>
            <h2 className={`text-6xl md:text-7xl font-light mb-8 leading-none tracking-tight ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Pronto para transformar sua assistência?
            </h2>
            <p className={`text-xl md:text-2xl mb-12 leading-relaxed font-light max-w-4xl mx-auto ${
              isDarkMode ? 'text-white/70' : 'text-gray-600'
            }`}>
              Junte-se a centenas de assistências que já confiam no Consert para 
              gerenciar seus negócios de forma mais eficiente e lucrativa!
            </p>
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
              <button 
                onClick={() => router.push('/cadastro')}
                className="px-12 py-5 bg-[#D1FE6E] text-black rounded-full font-medium text-lg hover:bg-[#B8E55A] transition-all duration-300 transform hover:scale-105"
              >
                Começar Agora
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
                alt="CONSERT Logo" 
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
                  <span className={isDarkMode ? 'text-white/70' : 'text-gray-600'}>(11) 4002-8922</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-[#B8E55A] mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className={isDarkMode ? 'text-white/70' : 'text-gray-600'}>contato@consert.com.br</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-[#B8E55A] mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className={isDarkMode ? 'text-white/70' : 'text-gray-600'}>Av. Paulista, 1000<br />São Paulo, SP</span>
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
                 © 2024 CONSERT. Todos os direitos reservados.
               </p>
              
              <div className="flex items-center space-x-6">
                <Link href="/termos" className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Termos</Link>
                <Link href="/politicas-privacidade" className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Privacidade</Link>
                <Link href="/sobre" className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>Sobre</Link>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <p className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-gray-500'}`}>
                 <span className="text-[#B8E55A]">CONSERT</span> - Transformando assistências técnicas em negócios de sucesso desde 2022.
               </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}