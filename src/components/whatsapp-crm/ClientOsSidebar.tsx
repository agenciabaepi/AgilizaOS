'use client';

import Link from 'next/link';
import {
  User,
  FileText,
  CheckCircle2,
  CreditCard,
  Receipt,
  ExternalLink,
  Smartphone,
  Wrench,
} from 'lucide-react';
import type { ConversaDetalhe } from '@/app/whatsapp/page';
import type { WhatsAppOrdemResumo } from '@/lib/whatsapp-crm/types';

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

function formatAparelho(os: WhatsAppOrdemResumo) {
  const partes = [os.equipamento, os.marca, os.modelo, os.cor].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : 'Aparelho não informado';
}

function formatValor(os: WhatsAppOrdemResumo) {
  const total =
    os.valor_faturado ??
    Number(os.valor_servico || 0) + Number(os.valor_peca || 0);
  if (!total) return null;
  return Number(total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function OsCard({
  os,
  ctx,
  vinculada,
}: {
  os: WhatsAppOrdemResumo;
  ctx?: ConversaDetalhe['os_contexto'][0];
  vinculada: boolean;
}) {
  const valor = formatValor(os);

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        vinculada ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={16} className="text-blue-600 shrink-0" />
          <span className="font-medium text-sm truncate">OS #{os.numero_os}</span>
        </div>
        {vinculada && (
          <span className="text-[10px] uppercase tracking-wide text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
            Vinculada
          </span>
        )}
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-700">
        <Smartphone size={14} className="text-gray-400 shrink-0 mt-0.5" />
        <p className="leading-snug">{formatAparelho(os)}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {os.status && (
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
            {ctx?.status_os || os.status}
          </span>
        )}
        {os.status_tecnico && (
          <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
            <Wrench size={11} />
            {ctx?.status_tecnico || os.status_tecnico}
          </span>
        )}
      </div>

      {ctx && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          <StatusBadge ok={!!ctx.finalizado} label="Finalizado" />
          <StatusBadge ok={!!ctx.pago} label="Pago" />
          <StatusBadge ok={!!ctx.nota_fiscal_emitida} label="NF emitida" />
        </div>
      )}

      {os.data_entrega && (
        <p className="text-xs text-gray-500">
          Entrega prevista: {new Date(os.data_entrega).toLocaleDateString('pt-BR')}
        </p>
      )}

      {valor && <p className="text-sm font-medium text-gray-900">{valor}</p>}

      <Link
        href={`/ordens/${os.id}`}
        className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
      >
        Abrir ordem de serviço
        <ExternalLink size={12} />
      </Link>
    </div>
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
  const ordens = detalhe?.ordens_cliente ?? [];
  const ctxPorOs = new Map((detalhe?.os_contexto ?? []).map((c) => [c.os_id, c]));

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

          {conversa?.usuarios?.nome && (
            <p className="text-xs text-violet-800 bg-violet-50 border border-violet-100 rounded-lg px-2 py-1.5">
              Atendente: <span className="font-medium">{conversa.usuarios.nome}</span>
            </p>
          )}

          {!cliente?.id && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
              Cliente não encontrado para este número. Cadastre o telefone no cadastro de clientes.
            </p>
          )}
        </div>
      </div>

      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Ordens de serviço
          </h4>
          {ordens.length > 0 && (
            <span className="text-[10px] text-gray-500">{ordens.length}</span>
          )}
        </div>

        {loading && ordens.length === 0 ? (
          <p className="text-xs text-gray-500">Carregando OS...</p>
        ) : ordens.length === 0 ? (
          <p className="text-xs text-gray-500 rounded-lg bg-gray-50 border border-gray-100 p-3">
            {cliente?.id || conversa?.cliente_id
              ? 'Nenhuma ordem de serviço encontrada para este cliente.'
              : 'Vincule o cliente pelo telefone para ver as OS aqui.'}
          </p>
        ) : (
          <div className="space-y-3">
            {ordens.map((os) => (
              <OsCard
                key={os.id}
                os={os}
                ctx={ctxPorOs.get(os.id)}
                vinculada={conversa?.os_id === os.id}
              />
            ))}
          </div>
        )}
      </div>

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
