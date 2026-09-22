'use client';

import { useState, useEffect } from 'react';
import MenuLayout from '@/components/MenuLayout';
import Link from 'next/link';
import { useConfigPermission, AcessoNegadoComponent } from '@/hooks/useConfigPermission';
import {
  MessageCircle,
  Settings,
  Zap,
  ExternalLink,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import type { WhatsAppAutomacao } from '@/lib/whatsapp-crm/types';
import { EmbeddedSignupConnect } from '@/components/whatsapp-crm/EmbeddedSignupConnect';
import { whatsappCrmFetch } from '@/lib/api/whatsappCrmFetch';

const EVENTO_LABELS: Record<string, string> = {
  os_criada: 'OS cadastrada',
  os_status_alterado: 'Status alterado',
  os_aprovada: 'OS aprovada',
  os_concluida: 'Reparo concluído',
  os_entregue: 'OS entregue',
  os_orcamento_enviado: 'Orçamento pronto',
  os_aguardando_peca: 'Aguardando peça',
  pagamento_confirmado: 'Pagamento confirmado',
  nota_fiscal_emitida: 'Nota fiscal emitida',
};

export default function WhatsAppPage({ embedded = false }: { embedded?: boolean }) {
  const { podeAcessar } = useConfigPermission('whatsapp');
  const [aba, setAba] = useState<'conexao' | 'automacoes'>('conexao');
  const [config, setConfig] = useState<{
    display_phone_number?: string;
    ativo?: boolean;
    connection_mode?: 'cloud_api' | 'coexistence' | null;
    is_on_biz_app?: boolean;
  } | null>(null);
  const [automacoes, setAutomacoes] = useState<WhatsAppAutomacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [limpando, setLimpando] = useState(false);

  useEffect(() => {
    if (!podeAcessar) return;
    void carregarDados();
  }, [podeAcessar]);

  async function carregarDados() {
    setLoading(true);
    try {
      const [cfgRes, autoRes] = await Promise.all([
        whatsappCrmFetch('/api/whatsapp/crm/config'),
        whatsappCrmFetch('/api/whatsapp/crm/automations'),
      ]);
      const cfgJson = await cfgRes.json();
      const autoJson = await autoRes.json();
      if (cfgJson.success) {
        setConfig(cfgJson.data ?? null);
      }
      if (autoJson.success) setAutomacoes(autoJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAutomacao(id: string, ativo: boolean) {
    const res = await whatsappCrmFetch('/api/whatsapp/crm/automations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ativo }),
    });
    const json = await res.json();
    if (json.success) {
      setAutomacoes((prev) => prev.map((a) => (a.id === id ? { ...a, ativo } : a)));
    }
  }

  async function desconectarWhatsApp() {
    if (
      !confirm(
        'Desconectar o WhatsApp desta assistência? As conversas e mensagens do inbox serão removidas do Consert. Você poderá conectar de novo depois.'
      )
    ) {
      return;
    }

    setLimpando(true);
    try {
      const res = await whatsappCrmFetch('/api/whatsapp/crm/reset', { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setConfig(null);
        setAutomacoes([]);
        alert('WhatsApp desconectado.');
      } else {
        alert(json.error || 'Erro ao desconectar');
      }
    } finally {
      setLimpando(false);
    }
  }

  if (!podeAcessar) {
    const denied = <AcessoNegadoComponent />;
    return embedded ? denied : <MenuLayout><div className="p-8">{denied}</div></MenuLayout>;
  }

  const content = (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">WhatsApp</h2>
            <p className="text-gray-600 text-sm mt-0.5">
              Conecte o WhatsApp da assistência para atender clientes e enviar avisos de OS.
            </p>
          </div>
          <Link
            href="/whatsapp"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <MessageCircle size={16} />
            Abrir conversas
          </Link>
        </div>
      )}

      {embedded && (
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-gray-600">
            Conecte o WhatsApp da assistência para atender clientes e enviar avisos de OS.
          </p>
          <Link
            href="/whatsapp"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-green-700 hover:underline"
          >
            <MessageCircle size={16} />
            Abrir conversas
            <ExternalLink size={14} />
          </Link>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200">
        {(['conexao', 'automacoes'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setAba(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              aba === t
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'conexao' ? (
              <span className="inline-flex items-center gap-1.5"><Settings size={15} /> Conexão</span>
            ) : (
              <span className="inline-flex items-center gap-1.5"><Zap size={15} /> Automações</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : aba === 'conexao' ? (
        <div className="space-y-6 max-w-xl">
          {config?.ativo ? (
            <>
              <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex items-start gap-3">
                <CheckCircle2 size={22} className="text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">WhatsApp conectado</p>
                  {config.display_phone_number && (
                    <p className="text-sm text-green-800 mt-1">{config.display_phone_number}</p>
                  )}
                  <p className="text-sm text-green-800/90 mt-1">
                    {config.connection_mode === 'coexistence' || config.is_on_biz_app
                      ? 'Você continua usando o app no celular. As conversas também aparecem no Consert.'
                      : 'Pronto para receber e enviar mensagens pelo Consert.'}
                  </p>
                  <Link
                    href="/whatsapp"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-green-700 hover:underline"
                  >
                    <MessageCircle size={15} />
                    Ir para as conversas
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h3 className="font-medium text-gray-900">Desconectar</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Remove a conexão e as conversas do Consert. O WhatsApp Business no celular não é
                  apagado.
                </p>
                <button
                  type="button"
                  onClick={() => void desconectarWhatsApp()}
                  disabled={limpando}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  {limpando ? 'Desconectando...' : 'Desconectar WhatsApp'}
                </button>
              </div>
            </>
          ) : (
            <EmbeddedSignupConnect onConnected={() => void carregarDados()} />
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden max-w-2xl">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm text-gray-600">
              Escolha quais avisos o cliente recebe automaticamente quando a OS muda de status.
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {automacoes.map((a) => (
              <li key={a.id} className="px-4 py-4 flex items-start gap-4">
                <label className="flex items-center pt-1">
                  <input
                    type="checkbox"
                    checked={a.ativo}
                    onChange={(e) => toggleAutomacao(a.id, e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-600"
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-gray-900">{a.nome}</p>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {EVENTO_LABELS[a.evento] ?? a.evento}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap line-clamp-2">
                    {a.mensagem_template}
                  </p>
                </div>
              </li>
            ))}
            {automacoes.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-500">
                {config?.ativo
                  ? 'Nenhuma automação disponível ainda.'
                  : 'Conecte o WhatsApp na aba Conexão para liberar as automações.'}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );

  return embedded ? content : <MenuLayout><div className="p-8">{content}</div></MenuLayout>;
}
