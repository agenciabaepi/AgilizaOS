'use client';

import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/context/AuthContext';

const DIAS_LEMBRETE = 7;

function formatarData(iso: string | null | undefined) {
  if (!iso) return '';
  const s = String(iso).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) {
    const [y, mo, d] = m[1].split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString('pt-BR');
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

/**
 * Lembra o usuário 1 semana antes do vencimento (e no último dia).
 * Pagamento antecipado não muda o texto — só mostra dias restantes reais.
 */
export default function SubscriptionExpiryBanner() {
  const { session, empresaData } = useAuth();
  const { assinatura, loading, isAssinaturaVencida } = useSubscription();

  if (!session || !empresaData?.id || loading) return null;
  if (empresaData.sistema_liberado === true) return null;
  if (!assinatura) return null;
  if (isAssinaturaVencida()) return null;

  const status = String(assinatura.status || '');
  if (status !== 'active' && status !== 'ativa') return null;

  const vencimento = assinatura.proxima_cobranca || assinatura.data_fim;
  if (!vencimento) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prox = new Date(vencimento);
  if (Number.isNaN(prox.getTime())) return null;
  prox.setHours(0, 0, 0, 0);

  const diasRest = Math.round((prox.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diasRest < 0 || diasRest > DIAS_LEMBRETE) return null;

  const dataFmt = formatarData(vencimento);
  const urgente = diasRest <= 1;
  const texto =
    diasRest === 0
      ? `Seu acesso vence hoje (${dataFmt}). Renove agora para não interromper o uso.`
      : diasRest === 1
        ? `Seu acesso vence amanhã (${dataFmt}). Garanta a renovação para não interromper o uso.`
        : `Seu acesso vence em ${diasRest} dias (${dataFmt}). Você pode pagar agora — os dias restantes serão preservados.`;

  return (
    <div
      className={`sticky top-0 z-[60] border-b px-4 py-2.5 text-center text-sm ${
        urgente
          ? 'bg-amber-100 border-amber-300 text-amber-950'
          : 'bg-sky-50 border-sky-200 text-sky-950'
      }`}
    >
      <span>{texto} </span>
      <Link href="/assinatura" className="font-semibold underline underline-offset-2">
        Renovar assinatura
      </Link>
    </div>
  );
}
