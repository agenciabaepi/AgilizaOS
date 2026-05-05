'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FiCreditCard } from 'react-icons/fi';
import AuthGuardFinal from '@/components/AuthGuardFinal';
import MenuLayout from '@/components/MenuLayout';
import { Button } from '@/components/Button';
import { DIAS_TRIAL_GRATIS, dataFimTrialAPartirDe } from '@/config/trial';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

function formatarDataPt(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(String(iso).trim());
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarSóDataPt(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(String(iso).trim());
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TesteExpiradoPage() {
  const { empresaData } = useAuth();
  const { assinatura } = useSubscription();
  const cadastroIso =
    empresaData?.created_at?.trim() ||
    (assinatura?.data_inicio ? String(assinatura.data_inicio).trim() : '');
  const fimTrialIso =
    (assinatura?.data_trial_fim && String(assinatura.data_trial_fim).trim()) ||
    (cadastroIso ? dataFimTrialAPartirDe(cadastroIso) : null);

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
          {(cadastroIso || fimTrialIso) && (
            <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-100">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
                Resumo do período de teste
              </p>
              <dl className="grid gap-2 sm:grid-cols-2 sm:gap-x-4">
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">Cadastro da empresa</dt>
                  <dd className="font-medium tabular-nums">{formatarDataPt(cadastroIso || null)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">Encerramento do trial</dt>
                  <dd className="font-medium tabular-nums">{formatarSóDataPt(fimTrialIso)}</dd>
                </div>
              </dl>
            </div>
          )}
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
