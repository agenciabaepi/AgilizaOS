'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

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
              className="transition-all duration-500 ease-out"
              style={{
                transform: `scale(${1 + (scrollY * 0.0003)})`,
                filter: `brightness(${1 + (scrollY * 0.0002)})`
              }}
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
          <div className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-12">
            <div className="w-5 h-5 bg-red-500 rounded-full mr-3"></div>
            <span className="text-white/90 text-sm font-light tracking-wide">4.8 estrelas, 50+ avaliações</span>
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
                src="/assets/imagens/macbook_pro.png" 
                alt="MacBook Pro with Consert" 
                width={1200} 
                height={900}
                className="w-full max-w-5xl transition-all duration-700 ease-out"
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
      <div id="recursos" className="relative z-10 px-6 py-20 lg:px-8 bg-gradient-to-b from-gray-800/50 to-gray-900/50">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Tudo que sua oficina precisa
            </h2>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto leading-relaxed">
              Uma plataforma completa com todas as ferramentas essenciais para modernizar sua oficina
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div 
              className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-[#D1FE6E]/20 hover:border-[#D1FE6E]/40 transition-all duration-500 ease-out"
              style={{
                transform: `scale(${1 + (scrollY * 0.0001)})`,
                filter: `brightness(${1 + (scrollY * 0.00005)})`
              }}
            >
              <div className="w-16 h-16 bg-[#D1FE6E] rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-all duration-500">
                <span className="text-gray-900 text-2xl">📋</span>
              </div>
              <h3 className="text-white font-bold text-xl mb-4">Ordens de Serviço</h3>
              <p className="text-gray-300 leading-relaxed">
                Crie e gerencie ordens de serviço de forma simples e organizada. 
                Acompanhe o progresso em tempo real.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-[#D1FE6E]/20 hover:border-[#D1FE6E]/40 transition-all duration-500 ease-out hover:transform hover:scale-105 hover:brightness-110">
              <div className="w-16 h-16 bg-[#D1FE6E] rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-all duration-500 hover:scale-110">
                <span className="text-gray-900 text-2xl">👥</span>
              </div>
              <h3 className="text-white font-bold text-xl mb-4">Gestão de Clientes</h3>
              <p className="text-gray-300 leading-relaxed">
                Cadastre e acompanhe seus clientes com histórico completo. 
                Histórico de serviços e veículos.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-[#D1FE6E]/20 hover:border-[#D1FE6E]/40 transition-all duration-500 ease-out hover:transform hover:scale-105 hover:brightness-110">
              <div className="w-16 h-16 bg-[#D1FE6E] rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-all duration-500 hover:scale-110">
                <span className="text-gray-900 text-2xl">💰</span>
              </div>
              <h3 className="text-white font-bold text-xl mb-4">Controle Financeiro</h3>
              <p className="text-gray-300 leading-relaxed">
                Acompanhe receitas, despesas e lucros em tempo real. 
                Relatórios financeiros detalhados.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-[#D1FE6E]/20 hover:border-[#D1FE6E]/40 transition-all duration-500 ease-out hover:transform hover:scale-105 hover:brightness-110">
              <div className="w-16 h-16 bg-[#D1FE6E] rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-all duration-500 hover:scale-110">
                <span className="text-gray-900 text-2xl">📊</span>
              </div>
              <h3 className="text-white font-bold text-xl mb-4">Relatórios Avançados</h3>
              <p className="text-gray-300 leading-relaxed">
                Relatórios detalhados para tomar decisões estratégicas. 
                Dashboards personalizáveis.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-[#D1FE6E]/20 hover:border-[#D1FE6E]/40 transition-all duration-500 ease-out hover:transform hover:scale-105 hover:brightness-110">
              <div className="w-16 h-16 bg-[#D1FE6E] rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-all duration-500 hover:scale-110">
                <span className="text-gray-900 text-2xl">📱</span>
              </div>
              <h3 className="text-white font-bold text-xl mb-4">Acesso Mobile</h3>
              <p className="text-gray-300 leading-relaxed">
                Acesse o sistema de qualquer dispositivo, a qualquer hora. 
                Interface responsiva e otimizada.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-[#D1FE6E]/20 hover:border-[#D1FE6E]/40 transition-all duration-500 ease-out hover:transform hover:scale-105 hover:brightness-110">
              <div className="w-16 h-16 bg-[#D1FE6E] rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-all duration-500 hover:scale-110">
                <span className="text-gray-900 text-2xl">🔒</span>
              </div>
              <h3 className="text-white font-bold text-xl mb-4">Segurança Total</h3>
              <p className="text-gray-300 leading-relaxed">
                Seus dados protegidos com a mais alta segurança. 
                Backup automático e criptografia.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div id="precos" className="relative z-10 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="bg-gradient-to-r from-[#D1FE6E]/10 to-[#D1FE6E]/5 rounded-3xl p-12 border border-[#D1FE6E]/20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Pronto para transformar sua oficina?
            </h2>
            <p className="text-gray-300 text-xl mb-8 leading-relaxed">
              Junte-se a centenas de oficinas que já confiam no Consert para 
              gerenciar seus negócios de forma mais eficiente e lucrativa.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button 
                onClick={() => router.push('/cadastro')}
                className="px-10 py-4 bg-[#D1FE6E] text-gray-900 rounded-lg font-bold text-lg hover:bg-[#B8E55A] transition-all duration-300 shadow-2xl hover:shadow-[#D1FE6E]/25 transform hover:-translate-y-1"
              >
                🚀 Começar Agora - Grátis
              </button>
              <button 
                onClick={() => router.push('/login')}
                className="px-10 py-4 bg-transparent text-white border-2 border-white rounded-lg font-bold text-lg hover:bg-white hover:text-gray-900 transition-all duration-300"
              >
                👀 Ver Demonstração
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-16 lg:px-8 border-t border-[#D1FE6E]/20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center justify-center mb-6 md:mb-0">
              <Image 
                src="/assets/imagens/logobranco.png" 
                alt="Consert Logo" 
                width={160} 
                height={160}
                className="transition-all duration-500 ease-out"
                style={{
                  transform: `scale(${1 + (scrollY * 0.0003)})`,
                  filter: `brightness(${1 + (scrollY * 0.0002)})`
                }}
              />
            </div>
            
            <div className="flex space-x-8 text-gray-300">
              <Link href="#termos" className="hover:text-[#D1FE6E] transition-colors duration-300 font-medium">Termos</Link>
              <Link href="#privacidade" className="hover:text-[#D1FE6E] transition-colors duration-300 font-medium">Privacidade</Link>
              <Link href="#suporte" className="hover:text-[#D1FE6E] transition-colors duration-300 font-medium">Suporte</Link>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-[#D1FE6E]/20 text-center">
            <p className="text-gray-400 text-sm">
              © 2024 Consert. Todos os direitos reservados. 
              <span className="text-[#D1FE6E] font-semibold"> Transformando assistências em negócios de sucesso.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}