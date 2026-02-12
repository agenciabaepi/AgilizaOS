'use client';

import Image from 'next/image';
import Link from 'next/link';
import logo from '@/assets/imagens/logopreto.png';
import { FiAlertCircle, FiMail, FiArrowLeft } from 'react-icons/fi';

const EMAIL_SUPORTE = process.env.NEXT_PUBLIC_EMAIL_SUPORTE || 'suporte@gestaoconsert.com.br';

export default function EmpresaDesativadaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image src={logo} alt="Gestão Consert" width={180} height={180} />
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <FiAlertCircle className="w-8 h-8 text-amber-600" />
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Conta desativada
          </h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            A empresa associada à sua conta foi desativada. O acesso ao sistema está temporariamente suspenso.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-gray-700 font-medium mb-2">
              Precisa de ajuda?
            </p>
            <p className="text-sm text-gray-600 mb-3">
              Entre em contato com nosso suporte para mais informações ou para regularizar sua situação:
            </p>
            <a
              href={`mailto:${EMAIL_SUPORTE}`}
              className="inline-flex items-center gap-2 text-gray-900 font-medium hover:text-green-600 transition-colors"
            >
              <FiMail className="w-5 h-5" />
              {EMAIL_SUPORTE}
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
            >
              <FiArrowLeft className="w-5 h-5" />
              Voltar ao login
            </Link>
            <a
              href={`mailto:${EMAIL_SUPORTE}?subject=Empresa desativada - Solicitação de suporte`}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-900 text-gray-900 font-medium hover:bg-gray-50 transition-colors"
            >
              <FiMail className="w-5 h-5" />
              Contatar suporte
            </a>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Ao entrar em contato, informe seu e-mail cadastrado para agilizar o atendimento.
        </p>
      </div>
    </div>
  );
}
