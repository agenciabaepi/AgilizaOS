import { describe, expect, it } from 'vitest';
import {
  calcularDataFimTrialYmd,
  calcularTransicaoPosTrial,
  calcularVencimentoAposPagamentoMensal,
  calcularRenovacaoAposPagamento,
  decidirAcesso,
  temAcesso,
  DIAS_TRIAL,
} from '../index';

describe('trial unificado 30 dias', () => {
  it('contratou 20/06 → trial vence 20/07', () => {
    expect(DIAS_TRIAL).toBe(30);
    expect(calcularDataFimTrialYmd('2025-06-20')).toBe('2025-07-20');
  });

  it('libera durante o trial e bloqueia no dia seguinte ao fim', () => {
    const assinatura = {
      status: 'trial',
      data_inicio: '2025-06-20',
      data_trial_fim: '2025-07-20',
    };
    expect(
      temAcesso({
        assinatura,
        agora: new Date('2025-07-20T15:00:00.000Z'),
      })
    ).toBe(true);
    expect(
      decidirAcesso({
        assinatura,
        agora: new Date('2025-07-21T15:00:00.000Z'),
      }).fase
    ).toBe('prorata');
    expect(
      temAcesso({
        assinatura,
        agora: new Date('2025-07-21T15:00:00.000Z'),
      })
    ).toBe(false);
  });
});

describe('pró-rata trial → primeiro dia 10', () => {
  it('contratou 20/06: trial 20/07, 20 dias até 10/08, valor proporcional', () => {
    const t = calcularTransicaoPosTrial({
      contratacaoYmd: '2025-06-20',
      valorMensal: 150,
    });
    expect(t.trialFimYmd).toBe('2025-07-20');
    expect(t.primeiroDia10Ymd).toBe('2025-08-10');
    expect(t.diasProrata).toBe(20);
    // 150 * 20 / 30 = 100
    expect(t.valorProrata).toBe(100);
  });

  it('pagamento pró-rata libera até o primeiro dia 10', () => {
    const r = calcularRenovacaoAposPagamento({
      pagamentoYmd: '2025-07-25',
      tipo: 'prorata',
      contratacaoYmd: '2025-06-20',
      valorMensal: 150,
    });
    expect(r.vencimentoYmd).toBe('2025-08-10');
    expect(r.diasProrata).toBe(20);
    expect(r.tipo).toBe('prorata');
  });
});

describe('vencimento fixo dia 10 — ciclo mensal', () => {
  it('pagamento em dia (antes do vencimento) renova para o próximo dia 10', () => {
    const r = calcularVencimentoAposPagamentoMensal({
      pagamentoYmd: '2025-08-05',
      vencimentoAtualYmd: '2025-08-10',
    });
    expect(r.noPrazo).toBe(true);
    expect(r.vencimentoYmd).toBe('2025-09-10');
  });

  it('pagamento no próprio dia 10 renova para o próximo mês', () => {
    const r = calcularVencimentoAposPagamentoMensal({
      pagamentoYmd: '2025-08-10',
      vencimentoAtualYmd: '2025-08-10',
    });
    expect(r.noPrazo).toBe(true);
    expect(r.vencimentoYmd).toBe('2025-09-10');
  });

  it('pagamento atrasado (dia 15) perde os dias e vai ao próximo dia 10', () => {
    const r = calcularVencimentoAposPagamentoMensal({
      pagamentoYmd: '2025-08-15',
      vencimentoAtualYmd: '2025-08-10',
    });
    expect(r.noPrazo).toBe(false);
    expect(r.vencimentoYmd).toBe('2025-09-10');
  });
});

describe('liberação imediata após pagamento', () => {
  it('após confirmar pró-rata, acesso libera na hora até o dia 10', () => {
    const renovacao = calcularRenovacaoAposPagamento({
      pagamentoYmd: '2025-07-25',
      tipo: 'prorata',
      contratacaoYmd: '2025-06-20',
      valorMensal: 150,
    });

    const decisao = decidirAcesso({
      assinatura: {
        status: 'active',
        data_fim: renovacao.dataFimIso,
        proxima_cobranca: renovacao.dataFimIso,
        data_trial_fim: '2025-07-20',
      },
      agora: new Date('2025-07-25T18:00:00.000Z'),
    });

    expect(decisao.liberado).toBe(true);
    expect(decisao.fase).toBe('mensal');
    expect(decisao.vencimentoYmd).toBe('2025-08-10');
  });

  it('após renovação mensal atrasada, libera na hora sem recuperar dias perdidos', () => {
    const renovacao = calcularRenovacaoAposPagamento({
      pagamentoYmd: '2025-08-15',
      tipo: 'mensal',
      vencimentoAtualYmd: '2025-08-10',
      valorMensal: 150,
    });

    expect(renovacao.vencimentoYmd).toBe('2025-09-10');
    expect(renovacao.noPrazo).toBe(false);

    expect(
      temAcesso({
        assinatura: {
          status: 'active',
          data_fim: renovacao.dataFimIso,
          proxima_cobranca: renovacao.dataFimIso,
        },
        agora: new Date('2025-08-15T12:00:00.000-03:00'),
      })
    ).toBe(true);

    // Dias 11–14 já passaram sem cobertura — não há compensação no vencimento
    expect(
      temAcesso({
        assinatura: {
          status: 'active',
          data_fim: '2025-08-10T12:00:00.000Z',
          proxima_cobranca: '2025-08-10T12:00:00.000Z',
        },
        agora: new Date('2025-08-12T12:00:00.000-03:00'),
      })
    ).toBe(false);
  });

  it('no dia do vencimento ainda tem acesso; no dia seguinte bloqueia', () => {
    const assinatura = {
      status: 'active',
      data_fim: '2025-08-10T12:00:00.000Z',
      proxima_cobranca: '2025-08-10T12:00:00.000Z',
    };
    expect(
      temAcesso({ assinatura, agora: new Date('2025-08-10T20:00:00.000-03:00') })
    ).toBe(true);
    expect(
      temAcesso({ assinatura, agora: new Date('2025-08-11T08:00:00.000-03:00') })
    ).toBe(false);
  });
});
