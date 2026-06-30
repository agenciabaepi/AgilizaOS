'use client';

import { useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCaixa } from '@/hooks/useCaixa';
import { createPdvApi, type PdvApiDeps } from './pdvService';

export function usePdvApi() {
  const { usuarioData, empresaData, session, user } = useAuth();
  const caixa = useCaixa();

  const depsRef = useRef<PdvApiDeps>({
    empresaId: '',
    authUserId: '',
    turnoAtual: null,
    abrirCaixa: caixa.abrirCaixa,
    fecharCaixa: caixa.fecharCaixa,
    adicionarMovimentacao: caixa.adicionarMovimentacao,
    registrarVenda: caixa.registrarVenda,
    calcularSaldoAtual: caixa.calcularSaldoAtual,
    verificarTurnoAberto: caixa.verificarTurnoAberto,
  });

  depsRef.current = {
    empresaId: usuarioData?.empresa_id ?? '',
    authUserId: user?.id ?? '',
    accessToken: session?.access_token,
    turnoAtual: caixa.turnoAtual,
    abrirCaixa: caixa.abrirCaixa,
    fecharCaixa: caixa.fecharCaixa,
    adicionarMovimentacao: caixa.adicionarMovimentacao,
    registrarVenda: caixa.registrarVenda,
    calcularSaldoAtual: caixa.calcularSaldoAtual,
    verificarTurnoAberto: caixa.verificarTurnoAberto,
    empresaNome: empresaData?.nome,
  };

  const api = useMemo(() => createPdvApi(() => depsRef.current), []);

  return { api, caixa, empresaId: usuarioData?.empresa_id ?? '', userId: usuarioData?.id ?? '' };
}
