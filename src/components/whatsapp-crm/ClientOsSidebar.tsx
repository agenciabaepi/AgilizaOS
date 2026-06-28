'use client';

import Link from 'next/link';
import {
  User,
  FileText,
  CheckCircle2,
  CreditCard,
  Receipt,
  ExternalLink,
} from 'lucide-react';
import type { ConversaDetalhe } from '@/app/whatsapp/page';

interface Props {
  detalhe: ConversaDetalhe | null;
  loading: boolean;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
        ok ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {ok ? <CheckCircle2 size={12} /> : null}
      {label}
    </span>
  );
}

export function ClientOsSidebar({ detalhe, loading }: Props) {
  if (!detalhe && !loading) {
    return (
      <aside className="w-80 shrink-0 border-l border-gray-200 bg-white hidden xl:block" />
    );
  }

  const conversa = detalhe?.conversa;
  const cliente = conversa?.clientes;
  const os = conversa?.ordens_servico;
  const ctx = detalhe?.os_contexto?.[0];

  return (
    <aside className="w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto hidden xl:flex xl:flex-col">
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
          Smart cards
        </h3>

        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <User size={20} className="text-green-700" />
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">
                {cliente?.nome || conversa?.nome_contato || '—'}
              </p>
              <p className="text-xs text-gray-500">{conversa?.telefone}</p>
              {cliente?.email && (
                <p className="text-xs text-gray-500">{cliente.email}</p>
              )}
            </div>
          </div>

          {cliente?.id && (
            <Link
              href={`/clientes/${cliente.id}`}
              className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
            >
              Ver ficha do cliente
              <ExternalLink size={12} />
            </Link>
          )}
        </div>
      </div>

      {os && (
        <div className="p-4 border-b border-gray-100">
          <div className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              <span className="font-medium text-sm">OS #{os.numero_os}</span>
            </div>

            <p className="text-xs text-gray-600">
              {[os.equipamento, os.marca, os.modelo].filter(Boolean).join(' ')}
            </p>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                {ctx?.status_os || os.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <StatusBadge ok={!!ctx?.finalizado} label="Finalizado" />
              <StatusBadge ok={!!ctx?.pago} label="Pago" />
              <StatusBadge ok={!!ctx?.nota_fiscal_emitida} label="NF emitida" />
            </div>

            {ctx?.nota_fiscal_numero && (
              <p className="text-xs text-gray-500">
                NF: {ctx.nota_fiscal_numero}
              </p>
            )}

            {ctx?.valor_faturado != null && (
              <p className="text-sm font-medium text-gray-900">
                {Number(ctx.valor_faturado).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            )}

            <Link
              href={`/ordens/${os.id}`}
              className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
            >
              Abrir ordem de serviço
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}

      <div className="p-4 flex-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Notas internas
        </h4>
        {detalhe?.notas?.length ? (
          <ul className="space-y-2">
            {detalhe.notas.map((n) => (
              <li key={n.id} className="rounded-lg bg-amber-50 border border-amber-100 p-2 text-xs">
                <p className="text-gray-800 whitespace-pre-wrap">{n.conteudo}</p>
                <p className="text-gray-400 mt-1">
                  {n.autor_nome} · {new Date(n.created_at).toLocaleString('pt-BR')}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500">Nenhuma nota ainda. Use a aba &quot;Notas&quot; no chat.</p>
        )}

        {cliente?.observacoes && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Obs. do cliente
            </h4>
            <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{cliente.observacoes}</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-gray-50 p-2">
          <CreditCard size={16} className="mx-auto text-gray-400 mb-1" />
          <p className="text-[10px] text-gray-500">Pagamento</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <Receipt size={16} className="mx-auto text-gray-400 mb-1" />
          <p className="text-[10px] text-gray-500">Nota fiscal</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2">
          <FileText size={16} className="mx-auto text-gray-400 mb-1" />
          <p className="text-[10px] text-gray-500">OS</p>
        </div>
      </div>
    </aside>
  );
}
