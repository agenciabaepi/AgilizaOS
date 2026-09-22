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
import { WHATSAPP_CRM_ENABLED } from '@/config/whatsapp-crm-config';

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

/** Formulário técnico só em beta/dev — não aparece para o fluxo normal do cliente. */
const SHOW_TEST_MODE =
  WHATSAPP_CRM_ENABLED &&
  (process.env.NEXT_PUBLIC_ENVIRONMENT === 'beta' ||
    process.env.NEXT_PUBLIC_ENVIRONMENT === 'development');

export default function WhatsAppPage({ embedded = false }: { embedded?: boolean }) {
  const { podeAcessar } = useConfigPermission('whatsapp');
  const [aba, setAba] = useState<'conexao' | 'automacoes'>('conexao');
  const [config, setConfig] = useState<{
    display_phone_number?: string;
    phone_number_id?: string;
    business_account_id?: string;
    waba_id?: string;
    ativo?: boolean;
    connection_mode?: 'cloud_api' | 'coexistence' | null;
    is_on_biz_app?: boolean;
  } | null>(null);
  const [automacoes, setAutomacoes] = useState<WhatsAppAutomacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [limpando, setLimpando] = useState(false);
  const [salvandoTeste, setSalvandoTeste] = useState(false);
  const [formTeste, setFormTeste] = useState({
    phone_number_id: '',
    access_token: '',
    business_account_id: '',
  });

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
        const data = cfgJson.data ?? null;
        setConfig(data);
        if (data) {
          setFormTeste((f) => ({
            ...f,
            phone_number_id: data.phone_number_id ?? '',
            business_account_id: data.business_account_id ?? data.waba_id ?? '',
          }));
        }
      }
      if (autoJson.success) setAutomacoes(autoJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function salvarModoTeste() {
    setSalvandoTeste(true);
    try {
      const res = await whatsappCrmFetch('/api/whatsapp/crm/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: formTeste.phone_number_id.trim(),
          access_token: formTeste.access_token.trim(),
          business_account_id: formTeste.business_account_id.trim() || undefined,
          ativo: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setConfig(json.data);
        setFormTeste((f) => ({ ...f, access_token: '' }));
        alert('Número de teste conectado.');
        void carregarDados();
      } else {
        alert(json.error || 'Erro ao salvar');
      }
    } finally {
      setSalvandoTeste(false);
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
        setFormTeste({ phone_number_id: '', access_token: '', business_account_id: '' });
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

  const modoTesteForm = SHOW_TEST_MODE ? (
    <details className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4">
      <summary className="cursor-pointer text-sm font-medium text-gray-700">
        Modo teste (número da Meta)
      </summary>
      <div className="mt-3 space-y-3 border-t border-gray-200 pt-3">
        <p className="text-xs text-gray-500">
          Use o Phone Number ID e o token temporário da tela Configuração da API no painel Meta,
          enquanto a análise do app não for aprovada.
        </p>
        <label className="block text-sm">
          <span className="text-gray-700">Phone Number ID</span>
          <input
            type="text"
            value={formTeste.phone_number_id}
            onChange={(e) => setFormTeste({ ...formTeste, phone_number_id: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="783032591562273"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-700">Access Token</span>
          <input
            type="password"
            value={formTeste.access_token}
            onChange={(e) => setFormTeste({ ...formTeste, access_token: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder={config?.phone_number_id ? '•••••••• (novo token)' : 'Token gerado na Meta'}
          />
        </label>
        <label className="block text-sm">
          <span className="text-gray-700">WhatsApp Business Account ID</span>
          <input
            type="text"
            value={formTeste.business_account_id}
            onChange={(e) => setFormTeste({ ...formTeste, business_account_id: e.target.value })}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="1940948953356904"
          />
        </label>
        <button
          type="button"
          onClick={() => void salvarModoTeste()}
          disabled={salvandoTeste || !formTeste.phone_number_id}
          className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {salvandoTeste ? 'Salvando...' : 'Salvar número de teste'}
        </button>
      </div>
    </details>
  ) : null;

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

              {modoTesteForm}

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
            <>
              <EmbeddedSignupConnect onConnected={() => void carregarDados()} />
              {modoTesteForm}
            </>
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
