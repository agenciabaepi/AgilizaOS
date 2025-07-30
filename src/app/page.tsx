'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import macbookImage from '../assets/imagens/macbook.png';

export default function Home() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false); // Fecha o menu mobile
  };

  // Efeito vagalume que segue o mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(209, 254, 110, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(209, 254, 110, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px'
        }}></div>
      </div>
      
      {/* Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-transparent opacity-20"></div>

      {/* Vagalume Effect */}
      <div 
        className="fixed pointer-events-none z-50 transition-transform duration-100 ease-out"
        style={{
          left: mousePosition.x - 25,
          top: mousePosition.y - 25,
          transform: 'translate(0, 0)'
        }}
      >
        <div className="w-12 h-12 bg-[#D1FE6E] rounded-full opacity-60 blur-sm animate-pulse"></div>
        <div className="w-8 h-8 bg-[#D1FE6E] rounded-full opacity-40 blur-sm animate-pulse absolute top-2 left-2"></div>
        <div className="w-4 h-4 bg-[#D1FE6E] rounded-full opacity-20 blur-sm animate-pulse absolute top-4 left-4"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-8 py-6 lg:px-12">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <Image 
              src="/assets/imagens/logobranco.png" 
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
              className="text-white/80 hover:text-white transition-all duration-300 font-light text-lg tracking-wide"
            >
              Soluções
            </button>
            <button 
              onClick={() => scrollToSection('templates')}
              className="text-white/80 hover:text-white transition-all duration-300 font-light text-lg tracking-wide"
            >
              Templates
            </button>
            <button 
              onClick={() => scrollToSection('afiliados')}
              className="text-white/80 hover:text-white transition-all duration-300 font-light text-lg tracking-wide"
            >
              Afiliados
            </button>
            <button 
              onClick={() => scrollToSection('precos')}
              className="text-white/80 hover:text-white transition-all duration-300 font-light text-lg tracking-wide"
            >
              Preços
            </button>
            <button 
              onClick={() => scrollToSection('recursos')}
              className="text-white/80 hover:text-white transition-all duration-300 font-light text-lg tracking-wide"
            >
              Recursos
            </button>
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
              className="px-8 py-3 text-white border border-white/20 rounded-full font-medium hover:bg-white/10 transition-all duration-300"
            >
              Agendar Demo
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
          <div className="md:hidden mt-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 border border-[#D1FE6E]/20">
            <div className="flex flex-col space-y-4">
              <button 
                onClick={() => scrollToSection('solucoes')}
                className="text-white hover:text-[#D1FE6E] transition-colors duration-300 font-medium text-left"
              >
                Soluções
              </button>
              <button 
                onClick={() => scrollToSection('templates')}
                className="text-white hover:text-[#D1FE6E] transition-colors duration-300 font-medium text-left"
              >
                Templates
              </button>
              <button 
                onClick={() => scrollToSection('afiliados')}
                className="text-white hover:text-[#D1FE6E] transition-colors duration-300 font-medium text-left"
              >
                Afiliados
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
                  Agendar Demo
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 px-8 py-32 lg:px-12 lg:py-48">
        <div className="mx-auto max-w-5xl text-center">
          {/* Social Proof Badge */}
          <div className="inline-flex items-center px-6 py-3 bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-full mb-12">
            <div className="w-3 h-3 bg-[#D1FE6E] rounded-full mr-3"></div>
            <span className="text-white/80 text-sm font-light tracking-wide">+500 assistências confiam no Consert</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-6xl md:text-8xl font-light text-white mb-12 leading-none tracking-tight">
            Sua assistência com 
            <span className="text-[#D1FE6E] block font-medium">gestão inteligente</span>
          </h1>

          {/* Sub-headline */}
          <p className="text-xl md:text-2xl text-white/80 mb-16 max-w-3xl mx-auto leading-relaxed font-light">
            Consert transforma oficinas em máquinas de crescimento—onde cada ordem de serviço 
            impulsiona eficiência, engajamento real e momentum da marca no piloto automático.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
            <button 
              onClick={() => router.push('/login')}
              className="px-12 py-4 bg-[#D1FE6E] text-black rounded-full font-medium text-lg hover:bg-[#B8E55A] transition-all duration-300 transform hover:scale-105"
            >
              Falar com Vendas
            </button>
            <button 
              onClick={() => router.push('/cadastro')}
              className="px-12 py-4 text-white border border-white/30 rounded-full font-medium text-lg hover:bg-white/10 transition-all duration-300"
            >
              Começar Grátis
            </button>
          </div>
        </div>
      </div>

      {/* Product Demo Section */}
      <div id="solucoes" className="relative z-10 px-8 pb-32 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-center">
            {/* MacBook Pro Image */}
            <div className="relative mb-16 flex justify-center">
              <Image 
                src={macbookImage}
                alt="MacBook Pro with Consert" 
                width={1000} 
                height={750}
                className="w-full max-w-4xl transition-all duration-700 ease-out"
                style={{
                  transform: `scale(${1 + (scrollY * 0.0002)})`,
                  filter: `brightness(${1 + (scrollY * 0.0001)})`
                }}
              />
            </div>

            {/* Call to Action */}
            <div className="text-center max-w-lg">
              <div className="flex items-center justify-center mb-8">
                <svg className="w-6 h-6 text-white/60 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                <span className="text-white/80 font-light text-lg tracking-wide">Veja em ação</span>
              </div>
              <p className="text-white/70 text-lg mb-10 leading-relaxed font-light">
                Interface intuitiva e completa para gerenciar sua oficina de forma eficiente.
              </p>
              <button 
                onClick={() => router.push('/cadastro')}
                className="px-10 py-4 bg-[#D1FE6E] text-black rounded-full font-medium hover:bg-[#B8E55A] transition-all duration-300 transform hover:scale-105"
              >
                Testar Agora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="recursos" className="relative z-10 px-8 py-32 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-24">
            <h2 className="text-6xl md:text-7xl font-light text-white mb-8 leading-none tracking-tight">
              Tudo que sua assistência precisa
            </h2>
            <p className="text-white/70 text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed font-light">
              Uma plataforma completa com todas as ferramentas essenciais para modernizar sua assistência
            </p>
          </div>

          {/* Screenshots Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-24">
            {/* Dashboard Screenshot */}
            <div className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 ease-out hover:transform hover:scale-105">
                <div className="relative mb-6">
                  <div className="bg-gray-800 rounded-t-2xl p-4 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="bg-gray-900 rounded-b-2xl p-6">
                    <Image 
                      src="/assets/screenshots/dashboard.png"
                      alt="Dashboard do Consert"
                      width={400}
                      height={300}
                      className="w-full h-auto rounded-lg"
                      onError={(e) => {
                        // Fallback para mockup se a imagem não existir
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.style.display = 'block';
                        }
                      }}
                    />
                    <div className="space-y-4" style={{display: 'none'}}>
                      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                      <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="h-20 bg-[#D1FE6E]/20 rounded-lg flex items-center justify-center">
                          <span className="text-[#D1FE6E] text-sm font-medium">OS</span>
                        </div>
                        <div className="h-20 bg-[#D1FE6E]/20 rounded-lg flex items-center justify-center">
                          <span className="text-[#D1FE6E] text-sm font-medium">Clientes</span>
                        </div>
                        <div className="h-20 bg-[#D1FE6E]/20 rounded-lg flex items-center justify-center">
                          <span className="text-[#D1FE6E] text-sm font-medium">Receita</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-white font-light text-2xl mb-4 tracking-wide">Dashboard Intuitivo</h3>
                <p className="text-white/70 leading-relaxed text-lg font-light">
                  Visualize métricas importantes em tempo real. 
                  Controle total sobre sua assistência.
                </p>
              </div>
            </div>

            {/* Orders Screenshot */}
            <div className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 ease-out hover:transform hover:scale-105">
                <div className="relative mb-6">
                  <div className="bg-gray-800 rounded-t-2xl p-4 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="bg-gray-900 rounded-b-2xl p-6">
                    <Image 
                      src="/assets/screenshots/ordens.png"
                      alt="Ordens de Serviço do Consert"
                      width={400}
                      height={300}
                      className="w-full h-auto rounded-lg"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.style.display = 'block';
                        }
                      }}
                    />
                    <div className="space-y-3" style={{display: 'none'}}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                        <div className="h-6 bg-[#D1FE6E] rounded w-16"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                          <div className="w-3 h-3 bg-[#D1FE6E] rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-3 bg-gray-700 rounded w-2/3 mb-1"></div>
                            <div className="h-2 bg-gray-600 rounded w-1/2"></div>
                          </div>
                          <div className="h-4 bg-[#D1FE6E]/20 rounded w-12"></div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
                            <div className="h-2 bg-gray-600 rounded w-1/3"></div>
                          </div>
                          <div className="h-4 bg-yellow-500/20 rounded w-12"></div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-3 bg-gray-700 rounded w-3/4 mb-1"></div>
                            <div className="h-2 bg-gray-600 rounded w-2/3"></div>
                          </div>
                          <div className="h-4 bg-red-500/20 rounded w-12"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-white font-light text-2xl mb-4 tracking-wide">Ordens de Serviço</h3>
                <p className="text-white/70 leading-relaxed text-lg font-light">
                  Crie e gerencie ordens de forma simples e organizada. 
                  Acompanhe o progresso em tempo real.
                </p>
              </div>
            </div>

            {/* Clients Screenshot */}
            <div className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 ease-out hover:transform hover:scale-105">
                <div className="relative mb-6">
                  <div className="bg-gray-800 rounded-t-2xl p-4 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="bg-gray-900 rounded-b-2xl p-6">
                    <Image 
                      src="/assets/screenshots/clientes.png"
                      alt="Gestão de Clientes do Consert"
                      width={400}
                      height={300}
                      className="w-full h-auto rounded-lg"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.style.display = 'block';
                        }
                      }}
                    />
                    <div className="space-y-3" style={{display: 'none'}}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                        <div className="h-6 bg-[#D1FE6E] rounded w-16"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                          <div className="w-10 h-10 bg-[#D1FE6E] rounded-full flex items-center justify-center">
                            <span className="text-gray-900 text-sm font-bold">JS</span>
                          </div>
                          <div className="flex-1">
                            <div className="h-3 bg-gray-700 rounded w-2/3 mb-1"></div>
                            <div className="h-2 bg-gray-600 rounded w-1/2"></div>
                          </div>
                          <div className="h-4 bg-[#D1FE6E]/20 rounded w-8"></div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                          <div className="w-10 h-10 bg-[#D1FE6E] rounded-full flex items-center justify-center">
                            <span className="text-gray-900 text-sm font-bold">MS</span>
                          </div>
                          <div className="flex-1">
                            <div className="h-3 bg-gray-700 rounded w-1/2 mb-1"></div>
                            <div className="h-2 bg-gray-600 rounded w-1/3"></div>
                          </div>
                          <div className="h-4 bg-[#D1FE6E]/20 rounded w-8"></div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                          <div className="w-10 h-10 bg-[#D1FE6E] rounded-full flex items-center justify-center">
                            <span className="text-gray-900 text-sm font-bold">PC</span>
                          </div>
                          <div className="flex-1">
                            <div className="h-3 bg-gray-700 rounded w-3/4 mb-1"></div>
                            <div className="h-2 bg-gray-600 rounded w-2/3"></div>
                          </div>
                          <div className="h-4 bg-[#D1FE6E]/20 rounded w-8"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-white font-light text-2xl mb-4 tracking-wide">Gestão de Clientes</h3>
                <p className="text-white/70 leading-relaxed text-lg font-light">
                  Cadastre e acompanhe seus clientes com histórico completo. 
                  Histórico de serviços e veículos.
                </p>
              </div>
            </div>

            {/* Financial Screenshot */}
            <div className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-500 ease-out hover:transform hover:scale-105">
                <div className="relative mb-6">
                  <div className="bg-gray-800 rounded-t-2xl p-4 flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="bg-gray-900 rounded-b-2xl p-6">
                    <Image 
                      src="/assets/screenshots/financeiro.png"
                      alt="Controle Financeiro do Consert"
                      width={400}
                      height={300}
                      className="w-full h-auto rounded-lg"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.style.display = 'block';
                        }
                      }}
                    />
                    <div className="space-y-4" style={{display: 'none'}}>
                      <div className="flex justify-between items-center mb-4">
                        <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                        <div className="h-6 bg-[#D1FE6E] rounded w-16"></div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-[#D1FE6E] rounded-full flex items-center justify-center">
                              <span className="text-gray-900 text-xs font-bold">R$</span>
                            </div>
                            <div>
                              <div className="h-3 bg-gray-700 rounded w-20 mb-1"></div>
                              <div className="h-2 bg-gray-600 rounded w-16"></div>
                            </div>
                          </div>
                          <div className="text-[#D1FE6E] text-sm font-medium">R$ 2.450</div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">↑</span>
                            </div>
                            <div>
                              <div className="h-3 bg-gray-700 rounded w-24 mb-1"></div>
                              <div className="h-2 bg-gray-600 rounded w-20"></div>
                            </div>
                          </div>
                          <div className="text-green-500 text-sm font-medium">+15%</div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">📊</span>
                            </div>
                            <div>
                              <div className="h-3 bg-gray-700 rounded w-28 mb-1"></div>
                              <div className="h-2 bg-gray-600 rounded w-24"></div>
                            </div>
                          </div>
                          <div className="text-blue-500 text-sm font-medium">R$ 18.750</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-white font-light text-2xl mb-4 tracking-wide">Controle Financeiro</h3>
                <p className="text-white/70 leading-relaxed text-lg font-light">
                  Acompanhe receitas, despesas e lucros em tempo real. 
                  Relatórios financeiros detalhados.
                </p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-10 border border-white/10 hover:border-white/20 transition-all duration-500 ease-out hover:transform hover:scale-105">
                <div className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-8 shadow-2xl transition-all duration-500 group-hover:scale-110">
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-white font-light text-2xl mb-6 tracking-wide">Ordens de Serviço</h3>
                <p className="text-white/70 leading-relaxed text-lg font-light">
                  Crie e gerencie ordens de serviço de forma simples e organizada. 
                  Acompanhe o progresso em tempo real.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-10 border border-white/10 hover:border-white/20 transition-all duration-500 ease-out hover:transform hover:scale-105">
                <div className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-8 shadow-2xl transition-all duration-500 group-hover:scale-110">
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-light text-2xl mb-6 tracking-wide">Gestão de Clientes</h3>
                <p className="text-white/70 leading-relaxed text-lg font-light">
                  Cadastre e acompanhe seus clientes com histórico completo. 
                  Histórico de serviços e veículos.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-10 border border-white/10 hover:border-white/20 transition-all duration-500 ease-out hover:transform hover:scale-105">
                <div className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-8 shadow-2xl transition-all duration-500 group-hover:scale-110">
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-light text-2xl mb-6 tracking-wide">Controle Financeiro</h3>
                <p className="text-white/70 leading-relaxed text-lg font-light">
                  Acompanhe receitas, despesas e lucros em tempo real. 
                  Relatórios financeiros detalhados.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-10 border border-white/10 hover:border-white/20 transition-all duration-500 ease-out hover:transform hover:scale-105">
                <div className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-8 shadow-2xl transition-all duration-500 group-hover:scale-110">
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-white font-light text-2xl mb-6 tracking-wide">Relatórios Avançados</h3>
                <p className="text-white/70 leading-relaxed text-lg font-light">
                  Relatórios detalhados para tomar decisões estratégicas. 
                  Dashboards personalizáveis.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-10 border border-white/10 hover:border-white/20 transition-all duration-500 ease-out hover:transform hover:scale-105">
                <div className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-8 shadow-2xl transition-all duration-500 group-hover:scale-110">
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-white font-light text-2xl mb-6 tracking-wide">Acesso Mobile</h3>
                <p className="text-white/70 leading-relaxed text-lg font-light">
                  Acesse o sistema de qualquer dispositivo, a qualquer hora. 
                  Interface responsiva e otimizada.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="group">
              <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-10 border border-white/10 hover:border-white/20 transition-all duration-500 ease-out hover:transform hover:scale-105">
                <div className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-8 shadow-2xl transition-all duration-500 group-hover:scale-110">
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-white font-light text-2xl mb-6 tracking-wide">Segurança Total</h3>
                <p className="text-white/70 leading-relaxed text-lg font-light">
                  Seus dados protegidos com a mais alta segurança. 
                  Backup automático e criptografia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div id="precos" className="relative z-10 px-8 py-32 lg:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-16 border border-white/10">
            <h2 className="text-6xl md:text-7xl font-light text-white mb-8 leading-none tracking-tight">
              Pronto para transformar sua assistência?
            </h2>
            <p className="text-white/70 text-xl md:text-2xl mb-12 leading-relaxed font-light max-w-4xl mx-auto">
              Junte-se a centenas de assistências que já confiam no Consert para 
              gerenciar seus negócios de forma mais eficiente e lucrativa.
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
                className="px-12 py-5 text-white border border-white/30 rounded-full font-medium text-lg hover:bg-white/10 transition-all duration-300"
              >
                Ver Demonstração
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-20 lg:px-12 border-t border-white/10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center justify-center mb-8 md:mb-0">
              <Image 
                src="/assets/imagens/logobranco.png" 
                alt="Consert Logo" 
                width={160} 
                height={160}
                className="transition-all duration-500 ease-out hover:scale-110 hover:brightness-110"
              />
            </div>
            
            <div className="flex space-x-12 text-white/70">
              <Link href="#termos" className="hover:text-white transition-colors duration-300 font-light text-lg tracking-wide">Termos</Link>
              <Link href="#privacidade" className="hover:text-white transition-colors duration-300 font-light text-lg tracking-wide">Privacidade</Link>
              <Link href="#suporte" className="hover:text-white transition-colors duration-300 font-light text-lg tracking-wide">Suporte</Link>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-white/10 text-center">
            <p className="text-white/50 text-sm font-light">
              © 2024 Consert. Todos os direitos reservados. 
              <span className="text-white/70 font-light"> Transformando assistências em negócios de sucesso.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}