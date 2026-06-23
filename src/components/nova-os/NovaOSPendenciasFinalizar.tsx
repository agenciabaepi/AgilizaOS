'use client';

import { FiAlertCircle, FiCheckCircle, FiChevronRight } from 'react-icons/fi';

export interface PendenciaFinalizarOS {
  id: string;
  label: string;
  etapa: number;
  etapaNome: string;
}

interface NovaOSPendenciasFinalizarProps {
  pendencias: PendenciaFinalizarOS[];
  onIrParaEtapa: (etapa: number) => void;
}

export default function NovaOSPendenciasFinalizar({
  pendencias,
  onIrParaEtapa,
}: NovaOSPendenciasFinalizarProps) {
  const pronto = pendencias.length === 0;

  return (
    <div
      className={`rounded-xl border p-4 ${
        pronto
          ? 'border-emerald-200 bg-emerald-50/80'
          : 'border-amber-200 bg-amber-50/80'
      }`}
    >
      <div className="flex items-start gap-3">
        {pronto ? (
          <FiCheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <h4
            className={`text-sm font-semibold ${
              pronto ? 'text-emerald-900' : 'text-amber-900'
            }`}
          >
            {pronto
              ? 'Tudo pronto para criar a O.S.'
              : 'Itens obrigatórios pendentes'}
          </h4>
          <p
            className={`mt-1 text-xs leading-relaxed ${
              pronto ? 'text-emerald-800' : 'text-amber-800'
            }`}
          >
            {pronto
              ? 'Revise os dados e clique em Finalizar para concluir.'
              : 'Complete os itens abaixo para liberar o botão Finalizar.'}
          </p>

          {!pronto && (
            <ul className="mt-3 space-y-2">
              {pendencias.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onIrParaEtapa(item.etapa)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-200/80 bg-white px-3 py-2.5 text-left text-sm text-amber-950 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium capitalize">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-amber-700">
                        Ir para etapa {item.etapa} — {item.etapaNome}
                      </span>
                    </span>
                    <FiChevronRight className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
