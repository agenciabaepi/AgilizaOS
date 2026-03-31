'use client';

import { useRouter } from 'next/navigation';
import MenuLayout from '@/components/MenuLayout';
import AuthGuardFinal from '@/components/AuthGuardFinal';
import PixQRCode from '@/components/PixQRCode';
import { Button } from '@/components/Button';
import { FiArrowLeft } from 'react-icons/fi';
import { useValorAssinatura } from '@/hooks/useValorAssinatura';

export default function RenovarAssinaturaPage() {
  const router = useRouter();
  const { valor } = useValorAssinatura();

  return (
    <AuthGuardFinal>
      <MenuLayout>
      <div className="max-w-lg mx-auto py-8 px-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-6 border-gray-300"
        >
          <FiArrowLeft className="mr-2" />
          Voltar
        </Button>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Renovar Assinatura
          </h1>
          <p className="text-gray-600 mb-4">
            Sua assinatura expirou. Renove agora para continuar utilizando todos os recursos do sistema.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Assinatura</span>
              <span className="text-xl font-bold text-gray-900">
                R$ {valor.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">/mês</p>
          </div>

          <PixQRCode
            valor={valor}
            descricao="Renovação mensalidade Gestão Consert"
            onSuccess={() => {
              router.push('/dashboard');
            }}
          />
        </div>

        <p className="text-center text-sm text-gray-500">
          Após o pagamento via PIX, seu acesso será liberado em instantes.
        </p>
      </div>
      </MenuLayout>
    </AuthGuardFinal>
  );
}
