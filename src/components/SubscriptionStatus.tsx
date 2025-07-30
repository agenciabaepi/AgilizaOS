import { useSubscription } from '@/hooks/useSubscription';
import { FiStar, FiClock, FiAlertTriangle } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const SubscriptionStatus = () => {
  const { assinatura, diasRestantesTrial, isTrialExpired, isSubscriptionActive } = useSubscription();
  const [tempoRestante, setTempoRestante] = useState<string>('');
  const router = useRouter();

  // Calcular tempo restante em tempo real
  useEffect(() => {
    if (!assinatura || assinatura.status !== 'trial' || !assinatura.data_trial_fim) {
      setTempoRestante('');
      return;
    }

    const calcularTempoRestante = () => {
      const agora = new Date();
      const fimTrial = new Date(assinatura.data_trial_fim!);
      const diferenca = fimTrial.getTime() - agora.getTime();

      console.log('Debug Trial:', {
        agora: agora.toISOString(),
        fimTrial: fimTrial.toISOString(),
        diferenca: diferenca,
        diferencaHoras: diferenca / (1000 * 60 * 60),
        expirou: diferenca <= 0
      });

      // Verificar se expirou - FORÇAR verificação
      if (diferenca <= 0) {
        console.log('Teste Grátis EXPIRADO - forçando estado');
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

    // Atualizar a cada segundo
    const interval = setInterval(calcularTempoRestante, 1000);

    return () => clearInterval(interval);
  }, [assinatura]);

  const handleTrialClick = () => {
    if (assinatura?.status === 'trial') {
      router.push('/teste-expirado');
    }
  };

  if (!assinatura) return null;

  // Verificar se teste grátis expirou de forma mais robusta
  const verificarTesteGratisExpirado = () => {
    if (!assinatura || assinatura.status !== 'trial' || !assinatura.data_trial_fim) return false;
    const agora = new Date();
    const fimTrial = new Date(assinatura.data_trial_fim);
    return fimTrial < agora;
  };

  const testeGratisExpirado = verificarTesteGratisExpirado();

  // Se teste grátis expirou ou assinatura inativa
  if (testeGratisExpirado || !isSubscriptionActive()) {
    console.log('Debug: Teste Grátis expirado ou assinatura inativa');
    return (
      <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1">
        <FiAlertTriangle className="w-4 h-4 text-red-500" />
        <span className="text-xs text-red-700 font-medium">
          {testeGratisExpirado ? 'Teste Grátis Expirado' : 'Assinatura Expirada'}
        </span>
      </div>
    );
  }

  // Se está no teste grátis (e não expirou)
  if (assinatura.status === 'trial' && !testeGratisExpirado) {
    console.log('Debug: Teste Grátis ativo, tempo restante:', tempoRestante);
    const diasRestantes = diasRestantesTrial();
    const isProximoDoFim = diasRestantes <= 3;
    
    return (
      <div 
        onClick={handleTrialClick}
        className={`flex items-center gap-2 border rounded-lg px-3 py-1 transition-all duration-300 cursor-pointer hover:scale-105 ${
          isProximoDoFim 
            ? 'bg-red-50 border-red-200 animate-pulse' 
            : 'bg-orange-50 border-orange-200'
        }`}
        title={`Teste Grátis expira em ${tempoRestante || `${diasRestantes} dias`}. Clique para ver planos.`}
        onClick={() => router.push('/teste-expirado')}
      >
        <FiClock className={`w-4 h-4 ${
          isProximoDoFim ? 'text-red-500' : 'text-orange-500'
        }`} />
        <span className={`text-xs font-medium ${
          isProximoDoFim ? 'text-red-700' : 'text-orange-700'
        }`}>
          Teste Grátis • {tempoRestante || `${diasRestantes} dias`}
        </span>
      </div>
    );
  }

  // Se está ativo
  return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-1">
      <FiStar className="w-4 h-4 text-green-500" />
      <span className="text-xs text-green-700 font-medium">
        {assinatura.plano?.nome}
      </span>
    </div>
  );
}; 