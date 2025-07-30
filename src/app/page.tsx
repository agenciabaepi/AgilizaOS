'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import macbookImage from '../assets/imagens/macbook.png';

export default function Home() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const [animatedElements, setAnimatedElements] = useState<Set<string>>(new Set());
  // --- Analytics Animation State ---
  const [showAnalyticsAnimation, setShowAnalyticsAnimation] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const analyticsRef = useRef<HTMLDivElement | null>(null);
  // Animated numbers
  const [revenue, setRevenue] = useState(0);
  const [reduction, setReduction] = useState(0);
  const [satisfaction, setSatisfaction] = useState(0);
  const [numbersAnimated, setNumbersAnimated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Intersection Observer para animações de entrada
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const elementId = entry.target.getAttribute('data-animate');
          if (elementId) {
            setAnimatedElements(prev => new Set([...prev, elementId]));
          }
        }
      });
    }, observerOptions);

    // Observar elementos com animação
    const animatedElements = document.querySelectorAll('[data-animate]');
    animatedElements.forEach(el => observer.observe(el));

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  // --- Analytics Section Observer (separado) ---
  useEffect(() => {
    if (!analyticsRef.current) return;
    const analyticsObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setShowAnalyticsAnimation(true);
          // Reset os números apenas se ainda não animou
          if (!hasAnimated) {
            setRevenue(0);
            setReduction(0);
            setSatisfaction(0);
          }
          // Não definir hasAnimated aqui - será definido após a animação dos números
        } else {
          // Reset quando sair da tela
          setShowAnalyticsAnimation(false);
          setHasAnimated(false); // Permite animar novamente
          setNumbersAnimated(false);
        }
      });
    }, { 
      threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
      rootMargin: '0px 0px -10% 0px' // Trigger um pouco antes da seção ficar totalmente visível
    });
    analyticsObs.observe(analyticsRef.current);
    return () => analyticsObs.disconnect();
  }, []);

  // --- Animated Numbers Effect ---
  useEffect(() => {
    if (showAnalyticsAnimation && !hasAnimated) {
      const endRevenue = 127;
      const endReduction = 45;
      const endSatisfaction = 89;
      let frame = 0;
      const totalFrames = isMobile ? 30 : 40; // Menos frames no mobile
      const duration = isMobile ? 1000 : 1200; // Duração menor no mobile
      const interval = duration / totalFrames;
      
      const animate = () => {
        frame++;
        // Função de easing para animação mais natural
        const progress = frame / totalFrames;
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        
        const newRevenue = Math.round(endRevenue * easeOutQuart);
        const newReduction = Math.round(endReduction * easeOutQuart);
        const newSatisfaction = Math.round(endSatisfaction * easeOutQuart);
        
        setRevenue(newRevenue);
        setReduction(newReduction);
        setSatisfaction(newSatisfaction);
        
        if (frame < totalFrames) {
          setTimeout(animate, interval);
        } else {
          setRevenue(endRevenue);
          setReduction(endReduction);
          setSatisfaction(endSatisfaction);
          setNumbersAnimated(true);
          setHasAnimated(true); // Marca que já animou APÓS a animação terminar
        }
      };
      // Delay baseado no dispositivo
      setTimeout(animate, isMobile ? 400 : 600);
    }
  }, [showAnalyticsAnimation, hasAnimated, isMobile]);

  // --- Mobile Detection ---
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(209, 254, 110, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(209, 254, 110, 0.08) 1px, transparent 1px)
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
              onClick={() => scrollToSection('analytics')}
              className="text-white/80 hover:text-white transition-all duration-300 font-light text-lg tracking-wide"
            >
              Analytics
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
          <div className="md:hidden mt-4 bg-gray-800/90 backdrop-blur-sm rounded-xl p-6 border border-[#D1FE6E]/20">
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
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 px-8 py-32 lg:px-12 lg:py-48">
        <div className="mx-auto max-w-5xl text-center">
          {/* Social Proof Badge */}
          <div 
            data-animate="badge"
            className={`inline-flex items-center px-8 py-4 bg-white/5 backdrop-blur-xl border border-white/20 rounded-full mb-16 transition-all duration-1000 ease-out ${
              animatedElements.has('badge') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{
              boxShadow: '0 8px 32px rgba(209, 254, 110, 0.1)',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
            }}
          >
            <div className="w-3 h-3 bg-[#D1FE6E] rounded-full mr-4 animate-pulse"></div>
            <span className="text-white/90 text-sm font-light tracking-wide">+500 assistências confiam no Consert</span>
          </div>

          {/* Main Headline */}
          <h1 
            data-animate="headline"
            className={`text-6xl md:text-8xl font-light mb-16 leading-none tracking-tight transition-all duration-1000 ease-out text-gradient-primary ${
              animatedElements.has('headline') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
          >
            Sua assistência com 
            <span className="block font-medium text-gradient-secondary">gestão inteligente</span>
          </h1>

          {/* Sub-headline */}
          <p 
            data-animate="subheadline"
            className={`text-xl md:text-2xl text-white/80 mb-20 max-w-4xl mx-auto leading-relaxed font-light transition-all duration-1000 ease-out delay-300 ${
              animatedElements.has('subheadline') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Consert transforma oficinas em máquinas de crescimento—onde cada ordem de serviço 
            impulsiona eficiência, engajamento real e momentum da marca no piloto automático.
          </p>

          {/* CTA Buttons */}
          <div 
            data-animate="cta"
            className={`flex flex-col sm:flex-row gap-8 justify-center items-center transition-all duration-1000 ease-out delay-500 ${
              animatedElements.has('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <button 
              onClick={() => router.push('/login')}
              className="px-12 py-5 bg-gradient-to-r from-[#D1FE6E] to-[#B8E55A] text-black rounded-full font-medium text-lg hover:from-[#B8E55A] hover:to-[#A5D44A] transition-all duration-500 transform hover:scale-105 hover:shadow-2xl"
              style={{
                boxShadow: '0 4px 20px rgba(209, 254, 110, 0.3)'
              }}
            >
              Falar com Vendas
            </button>
            <button 
              onClick={() => router.push('/cadastro')}
              className="px-12 py-5 text-white border border-white/30 rounded-full font-medium text-lg hover:bg-white/10 hover:border-white/50 transition-all duration-500 backdrop-blur-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
              }}
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
            <div 
              data-animate="macbook"
              className={`relative mb-16 flex justify-center transition-all duration-1000 ease-out delay-300 ${
                animatedElements.has('macbook') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
            >
              <Image 
                src={macbookImage}
                alt="MacBook Pro with Consert" 
                width={1000} 
                height={750}
                className="w-full max-w-4xl transition-all duration-700 ease-out"
                style={{
                  transform: `scale(${1 + (scrollY * 0.0002)})`,
                  filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
                  transition: 'transform 0.1s ease-out'
                }}
              />
            </div>

            {/* Call to Action */}
            <div 
              data-animate="demo-cta"
              className={`text-center max-w-lg transition-all duration-1000 ease-out delay-500 ${
                animatedElements.has('demo-cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="flex items-center justify-center mb-8">
                <svg className="w-6 h-6 text-white/60 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                <span className="text-white/80 font-light text-lg tracking-wide">Veja em ação</span>
              </div>
              <p className="text-white/70 text-lg mb-10 leading-relaxed font-light">
                Interface intuitiva e completa para gerenciar sua assistência de forma eficiente.
              </p>
              <button 
                onClick={() => router.push('/cadastro')}
                className="px-10 py-4 bg-[#D1FE6E] text-black rounded-full font-medium hover:bg-[#B8E55A] transition-all duration-300 transform hover:scale-105"
                style={{
                  boxShadow: '0 4px 20px rgba(209, 254, 110, 0.3)'
                }}
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
          <div 
            data-animate="features-header"
            className={`text-center mb-32 transition-all duration-1000 ease-out ${
              animatedElements.has('features-header') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
            }`}
          >
            <h2 className="text-6xl md:text-7xl font-light mb-12 leading-none tracking-tight text-gradient-accent">
              Tudo que sua assistência precisa
            </h2>
            <p className="text-white/70 text-xl md:text-2xl max-w-4xl mx-auto leading-relaxed font-light">
              Uma plataforma completa com todas as ferramentas essenciais para modernizar sua assistência
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div 
              data-animate="feature-1"
              className={`group h-full transition-all duration-1000 ease-out ${
                animatedElements.has('feature-1') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
            >
              <div 
                className="h-full rounded-3xl p-8 border transition-all duration-500 ease-out hover:transform hover:scale-105 group-hover:shadow-2xl flex flex-col"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}
              >
                <div 
                  className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 group-hover:scale-110"
                  style={{
                    boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)'
                  }}
                >
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-white font-light text-xl mb-4 tracking-wide">Ordens de Serviço</h3>
                <p className="text-white/80 leading-relaxed text-base font-light flex-grow">
                  Crie e gerencie ordens de serviço de forma simples e organizada. 
                  Acompanhe o progresso em tempo real.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div 
              data-animate="feature-2"
              className={`group h-full transition-all duration-1000 ease-out delay-100 ${
                animatedElements.has('feature-2') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
            >
              <div 
                className="h-full rounded-3xl p-8 border transition-all duration-500 ease-out hover:transform hover:scale-105 group-hover:shadow-2xl flex flex-col"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}
              >
                <div 
                  className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 group-hover:scale-110"
                  style={{
                    boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)'
                  }}
                >
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-light text-xl mb-4 tracking-wide">Gestão de Clientes</h3>
                <p className="text-white/80 leading-relaxed text-base font-light flex-grow">
                  Cadastre e acompanhe seus clientes com histórico completo. 
                  Histórico de serviços e veículos.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div 
              data-animate="feature-3"
              className={`group h-full transition-all duration-1000 ease-out delay-200 ${
                animatedElements.has('feature-3') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
            >
              <div 
                className="h-full rounded-3xl p-8 border transition-all duration-500 ease-out hover:transform hover:scale-105 group-hover:shadow-2xl flex flex-col"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}
              >
                <div 
                  className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 group-hover:scale-110"
                  style={{
                    boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)'
                  }}
                >
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-white font-light text-xl mb-4 tracking-wide">Controle Financeiro</h3>
                <p className="text-white/80 leading-relaxed text-base font-light flex-grow">
                  Acompanhe receitas, despesas e lucros em tempo real. 
                  Relatórios financeiros detalhados.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div 
              data-animate="feature-4"
              className={`group h-full transition-all duration-1000 ease-out delay-300 ${
                animatedElements.has('feature-4') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
            >
              <div 
                className="h-full rounded-3xl p-8 border transition-all duration-500 ease-out hover:transform hover:scale-105 group-hover:shadow-2xl flex flex-col"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}
              >
                <div 
                  className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 group-hover:scale-110"
                  style={{
                    boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)'
                  }}
                >
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-white font-light text-xl mb-4 tracking-wide">Relatórios Avançados</h3>
                <p className="text-white/80 leading-relaxed text-base font-light flex-grow">
                  Relatórios detalhados para tomar decisões estratégicas. 
                  Dashboards personalizáveis.
                </p>
              </div>
            </div>

            {/* Feature 5 */}
            <div 
              data-animate="feature-5"
              className={`group h-full transition-all duration-1000 ease-out delay-400 ${
                animatedElements.has('feature-5') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
            >
              <div 
                className="h-full rounded-3xl p-8 border transition-all duration-500 ease-out hover:transform hover:scale-105 group-hover:shadow-2xl flex flex-col"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}
              >
                <div 
                  className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 group-hover:scale-110"
                  style={{
                    boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)'
                  }}
                >
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-white font-light text-xl mb-4 tracking-wide">Acesso Mobile</h3>
                <p className="text-white/80 leading-relaxed text-base font-light flex-grow">
                  Acesse o sistema de qualquer dispositivo, a qualquer hora. 
                  Interface responsiva e otimizada.
                </p>
              </div>
            </div>

            {/* Feature 6 */}
            <div 
              data-animate="feature-6"
              className={`group h-full transition-all duration-1000 ease-out delay-500 ${
                animatedElements.has('feature-6') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
            >
              <div 
                className="h-full rounded-3xl p-8 border transition-all duration-500 ease-out hover:transform hover:scale-105 group-hover:shadow-2xl flex flex-col"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}
              >
                <div 
                  className="w-20 h-20 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 group-hover:scale-110"
                  style={{
                    boxShadow: '0 8px 32px rgba(209, 254, 110, 0.2)'
                  }}
                >
                  <svg className="w-10 h-10 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-white font-light text-xl mb-4 tracking-wide">Segurança Total</h3>
                <p className="text-white/80 leading-relaxed text-base font-light flex-grow">
                  Seus dados protegidos com a mais alta segurança. 
                  Backup automático e criptografia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      <section id="analytics" ref={analyticsRef} className="relative z-10 px-8 py-32 lg:px-12">
        <div className="mx-auto max-w-6xl">
          {/* Section Header */}
          <div className="text-center mb-24">
            <h2 
              data-animate="analytics-headline"
              className={`text-5xl md:text-7xl font-light mb-8 leading-none tracking-tight transition-all duration-1000 ease-out text-gradient-accent ${
                animatedElements.has('analytics-headline') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
            >
              Dados que impulsionam resultados
            </h2>
            <p 
              data-animate="analytics-subheadline"
              className={`text-xl text-white/70 max-w-3xl mx-auto leading-relaxed font-light transition-all duration-1000 ease-out delay-300 ${
                animatedElements.has('analytics-subheadline') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              Dashboards inteligentes que transformam números em insights acionáveis
            </p>
          </div>

          {/* Analytics Grid - Centralized Layout */}
          <div className="max-w-5xl mx-auto">
            {/* Charts Container */}
            <div 
              data-animate="charts-container"
              className={`transition-all duration-1000 ease-out delay-200 ${
                animatedElements.has('charts-container') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
            >
              <div className="relative">
                {/* Main Chart */}
                <div 
                  className="relative p-8 rounded-3xl mb-8"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Chart Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-medium text-white mb-2">Receita Mensal</h3>
                      <p className="text-white/60 text-sm">Últimos 6 meses</p>
                      <p className="text-white/40 text-xs mt-1">Crescimento médio de 15% ao mês</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-[#D1FE6E] rounded-full"></div>
                      <span className="text-white/80 text-sm">Crescimento</span>
                      <div className="ml-4 text-right">
                        <div className="text-white/60 text-xs">Total: R$ 247.5k</div>
                        <div className="text-[#D1FE6E] text-xs">+23.4% vs período anterior</div>
                      </div>
                    </div>
                  </div>

                  {/* Animated Bar Chart */}
                  <div className="relative h-80 flex items-end justify-between space-x-2 pl-12">
                    {/* Grid Lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                      {[0, 25, 50, 75, 100].map((line) => (
                        <div key={line} className="border-t border-white/10 h-px"></div>
                      ))}
                    </div>
                    
                    {/* Y-axis Labels */}
                    <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-white/40 text-xs pointer-events-none w-12">
                      <span>R$ 50k</span>
                      <span>R$ 37.5k</span>
                      <span>R$ 25k</span>
                      <span>R$ 12.5k</span>
                      <span>R$ 0</span>
                    </div>
                    
                    {[65, 78, 82, 91, 88, 95].map((value, index) => (
                      <div key={index} className="flex-1 relative flex flex-col justify-end">
                        <div 
                          className="bg-gradient-to-t from-[#D1FE6E] to-[#B8E55A] rounded-t-lg"
                          style={{
                            height: `${Math.max(value, 10)}px`,
                            opacity: (showAnalyticsAnimation || hasAnimated) ? 1 : 0,
                            transform: (showAnalyticsAnimation || hasAnimated) ? 'scaleY(1)' : 'scaleY(0.3)',
                            transformOrigin: 'bottom',
                            transitionDelay: `${index * (isMobile ? 50 : 100)}ms`,
                            transition: `all ${isMobile ? '0.4s' : '0.6s'} cubic-bezier(0.4, 0, 0.2, 1)`,
                            willChange: 'transform, opacity'
                          }}
                        ></div>
                        {/* Value on top of bar */}
                        <div 
                          className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-white/80 text-xs font-medium"
                          style={{
                            opacity: (showAnalyticsAnimation || hasAnimated) ? 1 : 0,
                            transitionDelay: `${index * (isMobile ? 50 : 100) + (isMobile ? 200 : 300)}ms`,
                            transition: `opacity ${isMobile ? '0.3s' : '0.4s'} ease-out`,
                            willChange: 'opacity'
                          }}
                        >
                          R$ {Math.round((value / 100) * 50)}k
                        </div>
                        <div className="text-white/60 text-xs text-center mt-2">
                          {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'][index]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mini Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                  {/* Pie Chart */}
                  <div 
                    className="p-6 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <h4 className="text-white/80 text-sm mb-4">Distribuição de Serviços</h4>
                    <div className="relative w-24 h-24 mx-auto">
                      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#D1FE6E"
                          strokeWidth="8"
                          strokeDasharray="251.2"
                          strokeDashoffset="75.36"
                          className="transition-all duration-1000 ease-out"
                          style={{
                            transform: (showAnalyticsAnimation || hasAnimated) ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transformOrigin: 'center'
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white font-medium text-lg">{(showAnalyticsAnimation || hasAnimated) ? '70%' : '0%'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Line Chart */}
                  <div 
                    className="p-6 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <h4 className="text-white/80 text-sm mb-4">Clientes Ativos</h4>
                    <div className="relative h-24">
                      <svg className="w-full h-full" viewBox="0 0 100 40">
                        <path
                          d="M0,30 L20,25 L40,20 L60,15 L80,10 L100,5"
                          fill="none"
                          stroke="#D1FE6E"
                          strokeWidth="2"
                          className="transition-all duration-1000 ease-out"
                          style={{
                            strokeDasharray: (showAnalyticsAnimation || hasAnimated) ? '200' : '0',
                            strokeDashoffset: (showAnalyticsAnimation || hasAnimated) ? '0' : '200'
                          }}
                        />
                        {[0, 20, 40, 60, 80, 100].map((x, i) => (
                          <circle
                            key={i}
                            cx={x}
                            cy={[30, 25, 20, 15, 10, 5][i]}
                            r="2"
                            fill="#D1FE6E"
                            className="transition-all duration-1000 ease-out"
                            style={{
                              opacity: (showAnalyticsAnimation || hasAnimated) ? '1' : '0',
                              animationDelay: `${i * 100}ms`
                            }}
                          />
                        ))}
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Metrics Row */}
                <div 
                  data-animate="analytics-content"
                  className={`grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-1000 ease-out delay-400 ${
                    animatedElements.has('analytics-content') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                  }`}
                >
                  {/* Metric 1 */}
                  <div className="flex flex-col items-center text-center p-6 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-medium text-white mb-2 transition-all duration-500">
                      <span className={`transition-all duration-300 ${numbersAnimated ? 'animate-pulse' : ''}`}>
                        +{revenue}%
                      </span>
                    </h3>
                    <p className="text-white/70 text-sm">Crescimento na receita média mensal</p>
                  </div>

                  {/* Metric 2 */}
                  <div className="flex flex-col items-center text-center p-6 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-medium text-white mb-2 transition-all duration-500">
                      <span className={`transition-all duration-300 ${numbersAnimated ? 'animate-pulse' : ''}`}>
                        -{reduction}%
                      </span>
                    </h3>
                    <p className="text-white/70 text-sm">Redução no tempo de atendimento</p>
                  </div>

                  {/* Metric 3 */}
                  <div className="flex flex-col items-center text-center p-6 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-[#D1FE6E] to-[#B8E55A] rounded-xl flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-3xl font-medium text-white mb-2 transition-all duration-500">
                      <span className={`transition-all duration-300 ${numbersAnimated ? 'animate-pulse' : ''}`}>
                        +{satisfaction}%
                      </span>
                    </h3>
                    <p className="text-white/70 text-sm">Aumento na satisfação dos clientes</p>
                  </div>
                </div>

                {/* CTA */}
                <div className="text-center pt-12">
                  <button 
                    onClick={() => router.push('/cadastro')}
                    className="px-8 py-4 bg-gradient-to-r from-[#D1FE6E] to-[#B8E55A] text-black rounded-full font-medium hover:from-[#B8E55A] hover:to-[#A5D44A] transition-all duration-500 transform hover:scale-105"
                    style={{
                      boxShadow: '0 4px 20px rgba(209, 254, 110, 0.3)'
                    }}
                  >
                    Ver Dashboard Completo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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