'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FiCreditCard } from 'react-icons/fi';
import AuthGuardFinal from '@/components/AuthGuardFinal';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { DIAS_TRIAL_GRATIS } from '@/config/trial';

export default function TesteExpiradoPage() {
  return (
    <AuthGuardFinal>
      <MenuLayout>
        <div className="max-w-lg mx-auto py-10 px-4 text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/assets/imagens/logopreto.png"
              alt="Gestão Consert"
              width={120}
              height={120}
              className="dark:hidden"
            />
            <Image
              src="/assets/imagens/logobranco.png"
              alt="Gestão Consert"
              width={120}
              height={120}
              className="hidden dark:block"
            />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Período de teste encerrado
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Os {DIAS_TRIAL_GRATIS} dias gratuitos da sua empresa terminaram. Assine um plano para voltar a usar o
            sistema com todos os recursos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/assinatura">
              <Button className="w-full sm:w-auto inline-flex items-center justify-center gap-2">
                <FiCreditCard />
                Ver assinatura e pagamentos
              </Button>
            </Link>
            <Link href="/planos/renovar">
              <Button variant="outline" className="w-full sm:w-auto">
                Escolher plano
              </Button>
            </Link>
          </div>
        </div>
      </MenuLayout>
    </AuthGuardFinal>
  );
}
