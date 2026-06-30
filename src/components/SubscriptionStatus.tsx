import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/context/AuthContext';
import { computeDiasTrialTotal, dataFimTrialAPartirDe } from '@/config/trial';
import { FiStar, FiClock, FiAlertTriangle } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const SubscriptionStatus = () => {
  return <SubscriptionStatusContent />;
};

const SubscriptionStatusContent = () => {
  const { user, empresaData } = useAuth();
  const { assinatura, diasRestantesTrial, isTrialExpired, isSubscriptionActive, loading } = useSubscription();
  const [tempoRestante, setTempoRestante] = useState<string>('');
  const router = useRouter();

  // Calcular tempo restante em tempo real
  useEffect(() => {
    if (!assinatura || assinatura.status !== 'trial') {
      setTempoRestante('');
      return;
    }
    const fimIso =
      assinatura.data_trial_fim || dataFimTrialAPartirDe(empresaData?.created_at, empresaData?.dias_trial);
    if (!fimIso) {
      setTempoRestante('');
      return;
    }

    const calcularTempoRestante = () => {
      const agora = new Date();
      const fimTrial = new Date(fimIso);
      const diferenca = fimTrial.getTime() - agora.getTime();

      // Verificar se expirou - FORÇAR verificação
      if (diferenca <= 0) {
        setTempoRestante('Expirado');
        return;
      }

      const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

      if (dias > 0) {
        setTempoRestante(`${dias}d ${horas}h ${minutos}m`);
      } else if (horas > 0) {
        setTempoRestante(`${horas}h ${minutos}m ${segundos}s`);
      } else if (minutos > 0) {
        setTempoRestante(`${minutos}m ${segundos}s`);
      } else if (segundos > 0) {
        setTempoRestante(`${segundos}s`);
      } else {
        setTempoRestante('Expirado');
      }
    };

    // Calcular imediatamente
    calcularTempoRestante();

    // ✅ OTIMIZADO: Atualizar a cada 30 segundos em vez de cada segundo
    const interval = setInterval(calcularTempoRestante, 30000);

    return () => clearInterval(interval);
  }, [assinatura, empresaData?.created_at, empresaData?.dias_trial]);

  const handleTrialClick = () => {
    if (assinatura?.status === 'trial') {
      if (testeGratisExpirado) {
        router.push('/teste-expirado');
      } else {
        router.push('/assinatura');
      }
    }
  };

  if (loading && user) {
    return (
      <div
        className="h-8 min-w-[7rem] rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 animate-pulse"
        aria-busy="true"
        aria-label="Carregando status da assinatura"
      />
    );
  }

  if (!assinatura) return null;

  const testeGratisExpirado = isTrialExpired();

  // Se teste grátis expirou ou assinatura inativa
  if (testeGratisExpirado || !isSubscriptionActive()) {
    const handleRenovarClick = () => {
      if (testeGratisExpirado) {
        router.push('/teste-expirado');
      } else {
        router.push('/assinatura');
      }
    };
    return (
      <button
        type="button"
        onClick={handleRenovarClick}
        className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1 cursor-pointer hover:bg-red-100 hover:border-red-300 transition-colors"
        title="Clique para renovar sua assinatura"
      >
        <FiAlertTriangle className="w-4 h-4 text-red-500" />
        <span className="text-xs text-red-700 font-medium">
          {testeGratisExpirado ? 'Teste Grátis Expirado' : 'Assinatura Expirada'}
        </span>
      </button>
    );
  }

  // Se está no teste grátis (e não expirou)
  if (assinatura.status === 'trial' && !testeGratisExpirado) {
    // log suprimido
    const diasRestantes = diasRestantesTrial();
    const isProximoDoFim = diasRestantes <= 3;
    const fimTrialTitle =
      assinatura.data_trial_fim || dataFimTrialAPartirDe(empresaData?.created_at, empresaData?.dias_trial);
    const diasTotalTrial = computeDiasTrialTotal({
      empresaDiasTrial: empresaData?.dias_trial,
      dataInicio: assinatura.data_inicio,
      dataTrialFim: fimTrialTitle,
      empresaCreatedAt: empresaData?.created_at,
    });
    const titleTrial =
      `Teste de ${diasTotalTrial} dias · ${diasRestantes} dia(s) restante(s)` +
      (fimTrialTitle ? ` · até ${new Date(fimTrialTitle).toLocaleDateString('pt-BR')}` : '') +
      '. Clique para ver assinatura.';

    const labelVisivel =
      diasRestantes <= 1 && tempoRestante
        ? `Teste · ${tempoRestante}`
        : `Teste · ${diasRestantes}d rest.`;

    return (
      <div 
        onClick={handleTrialClick}
        className={`flex items-center gap-2 border rounded-lg px-3 py-1 transition-all duration-300 cursor-pointer hover:scale-105 ${
          isProximoDoFim 
            ? 'bg-red-50 border-red-200 animate-pulse' 
            : 'bg-orange-50 border-orange-200'
        }`}
        title={titleTrial}
      >
        <FiClock className={`w-4 h-4 shrink-0 ${
          isProximoDoFim ? 'text-red-500' : 'text-orange-500'
        }`} />
        <span className={`text-[10px] sm:text-xs font-medium leading-tight ${
          isProximoDoFim ? 'text-red-700' : 'text-orange-700'
        }`}>
          {labelVisivel}
        </span>
      </div>
    );
  }

  // Se está ativo
  return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1">
      <FiStar className="w-4 h-4 text-green-500" />
      <span className="text-xs text-green-700 font-medium">
        Assinatura
      </span>
    </div>
  );
}; 