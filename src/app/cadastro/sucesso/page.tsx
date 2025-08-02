'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo from '@/assets/imagens/logobranco.png';
import { FiCheckCircle, FiMail, FiLock, FiArrowRight } from 'react-icons/fi';

export default function CadastroSucessoPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Timer separado para redirecionamento
    const redirectTimer = setTimeout(() => {
      router.push('/login');
    }, 10000); // 10 segundos

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4">
      <div className="absolute top-0 left-0 w-full h-[400px] bg-black z-10 [clip-path:ellipse(140%_100%_at_50%_0%)]" />
      <div className="absolute top-[0px] left-0 w-full h-full bg-gradient-to-br from-[#cffb6d] to-white z-0" />
      
      <div className="relative z-20 w-full max-w-2xl space-y-6">
        <div className="flex justify-center mb-6">
          <Image src={logo} alt="" width={200} height={60} priority className="mx-auto" />
        </div>
        
        <div className="w-full max-w-2xl mx-auto p-8 bg-white rounded-[32px] shadow-xl">
          <div className="text-center mb-8">
            <FiCheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Cadastro Realizado com Sucesso!</h1>
            <p className="text-gray-600 mb-6">
              Sua empresa foi criada e você tem acesso ao sistema por 15 dias gratuitamente.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-green-800 mb-4">Próximos Passos:</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FiMail className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-green-800">1. Verifique seu e-mail</h3>
                  <p className="text-sm text-green-700">
                    Enviamos um e-mail de confirmação para você ativar sua conta.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <FiLock className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-green-800">2. Faça login</h3>
                  <p className="text-sm text-green-700">
                    Use o e-mail e senha que você cadastrou para acessar o sistema.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <FiArrowRight className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-green-800">3. Comece a usar</h3>
                  <p className="text-sm text-green-700">
                    Explore todas as funcionalidades disponíveis no seu plano.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">Informações Importantes:</h2>
            <ul className="text-sm text-blue-700 space-y-2">
              <li>• Seu período de teste é de <strong>15 dias gratuitos</strong></li>
              <li>• Você pode fazer login com seu <strong>e-mail</strong> e <strong>senha</strong></li>
              <li>• Todos os dados estão seguros na nuvem</li>
              <li>• Suporte disponível durante o período de teste</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => router.push('/login')}
              className="flex-1 bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
            >
              <FiArrowRight className="w-4 h-4" />
              Ir para o Login
            </button>
            
            <button
              onClick={() => router.push('/planos')}
              className="flex-1 bg-white text-black px-6 py-3 rounded-lg font-semibold border border-gray-300 hover:bg-gray-50 transition"
            >
              Ver Planos
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Redirecionamento automático em <span className="font-bold">{countdown}</span> segundos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 