'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bot,
  Plus,
  Trash2,
  Send,
  RotateCcw,
  Save,
  Sparkles,
  SlidersHorizontal,
  Store,
  MessageCircleQuestion,
  NotebookPen,
  FlaskConical,
  X,
  CheckCircle2,
} from 'lucide-react';
import { whatsappCrmFetch } from '@/lib/api/whatsappCrmFetch';
import type { WhatsAppIaConfig, WhatsAppIaFaqItem } from '@/lib/whatsapp-crm/types';

type ConfigForm = Omit<WhatsAppIaConfig, 'empresa_id' | 'created_at' | 'updated_at'>;

type EmpresaBasica = {
  nome: string | null;
  endereco: string | null;
  cidade: string | null;
  telefone: string | null;
};

type MsgTeste = { direcao: 'entrada' | 'saida'; conteudo: string; transferir?: boolean };

const inputClass =
  'mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-zinc-300';
const dicaClass = 'mt-1 block text-xs font-normal text-gray-500 dark:text-zinc-500';

const SUGESTOES_TESTE = [
  'Oi, que horas vocês abrem?',
  'Onde fica a loja?',
  'Quanto custa trocar a tela?',
  'Vocês consertam TV?',
];

function Secao({
  icon,
  titulo,
  descricao,
  acao,
  children,
}: {
  icon: ReactNode;
  titulo: string;
  descricao: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60">
      <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-zinc-800">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{titulo}</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">{descricao}</p>
          </div>
        </div>
        {acao}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function AssistenteIAConfig() {
  const [form, setForm] = useState<ConfigForm | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaBasica | null>(null);
  const [iaDisponivel, setIaDisponivel] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [testeAberto, setTesteAberto] = useState(false);
  const [teste, setTeste] = useState<MsgTeste[]>([]);
  const [textoTeste, setTextoTeste] = useState('');
  const [testando, setTestando] = useState(false);
  const fimTesteRef = useRef<HTMLDivElement>(null);
  const inputTesteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const res = await whatsappCrmFetch('/api/whatsapp/crm/ia');
      const json = await res.json();
      if (json.success) {
        const { empresa_id: _e, created_at: _c, updated_at: _u, ...cfg } = json.data as WhatsAppIaConfig;
        setForm({ ...cfg, faq: cfg.faq ?? [] });
        setEmpresa(json.empresa ?? null);
        setIaDisponivel(json.ia_disponivel !== false);
      } else {
        setErro(json.error || 'Erro ao carregar');
      }
    })();
  }, []);

  useEffect(() => {
    fimTesteRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [teste.length, testando]);

  useEffect(() => {
    if (testeAberto) inputTesteRef.current?.focus();
  }, [testeAberto]);

  if (!form) {
    return <p className="text-sm text-gray-500 dark:text-zinc-400">{erro ?? 'Carregando...'}</p>;
  }

  const set = <K extends keyof ConfigForm>(campo: K, valor: ConfigForm[K]) => {
    setForm((f) => (f ? { ...f, [campo]: valor } : f));
    setAlterado(true);
    setSalvoEm(null);
  };

  const setFaq = (i: number, campo: keyof WhatsAppIaFaqItem, valor: string) => {
    set(
      'faq',
      form.faq.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f))
    );
  };

  const enderecoEmpresa = [empresa?.endereco, empresa?.cidade].filter(Boolean).join(' - ');

  async function salvar(extra?: Partial<ConfigForm>) {
    if (!form) return;
    const dados = { ...form, ...extra };
    setSalvando(true);
    setErro(null);
    try {
      const res = await whatsappCrmFetch('/api/whatsapp/crm/ia', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      const json = await res.json();
      if (!json.success) {
        setErro(json.error || 'Erro ao salvar');
        return;
      }
      setForm(dados);
      setAlterado(false);
      setSalvoEm(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setErro('Erro de conexão');
    } finally {
      setSalvando(false);
    }
  }

  async function enviarTeste(texto?: string) {
    const conteudo = (texto ?? textoTeste).trim();
    if (!conteudo || testando || !form) return;
    const historico: MsgTeste[] = [...teste, { direcao: 'entrada', conteudo }];
    setTeste(historico);
    setTextoTeste('');
    setTestando(true);
    try {
      const res = await whatsappCrmFetch('/api/whatsapp/crm/ia/testar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: form,
          historico: historico.map(({ direcao, conteudo: c }) => ({ direcao, conteudo: c })),
        }),
      });
      const json = await res.json();
      setTeste((t) => [
        ...t,
        json.success
          ? { direcao: 'saida', conteudo: json.data.resposta, transferir: json.data.transferir }
          : { direcao: 'saida', conteudo: `⚠️ ${json.error || 'Erro ao testar'}` },
      ]);
    } catch {
      setTeste((t) => [...t, { direcao: 'saida', conteudo: '⚠️ Erro de conexão' }]);
    } finally {
      setTestando(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-5 pb-24">
      {!iaDisponivel && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          A chave da OpenAI não está configurada no servidor. O assistente não vai responder até ela ser
          configurada.
        </div>
      )}

      <div
        className={`overflow-hidden rounded-xl border ${
          form.ativo
            ? 'border-green-200 dark:border-green-900/60'
            : 'border-gray-200 dark:border-zinc-800'
        }`}
      >
        <div
          className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${
            form.ativo
              ? 'bg-gradient-to-r from-green-50 to-white dark:from-green-950/40 dark:to-zinc-900/60'
              : 'bg-white dark:bg-zinc-900/60'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                form.ativo
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400'
              }`}
            >
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 dark:text-zinc-100">Assistente IA no WhatsApp</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    form.ativo
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {form.ativo ? 'Ligado' : 'Desligado'}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-zinc-400">
                Responde os clientes com as informações abaixo e chama um atendente quando não souber.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setTesteAberto(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <FlaskConical size={16} />
              Testar
            </button>
            <label className="relative inline-flex cursor-pointer items-center" title={form.ativo ? 'Desligar' : 'Ligar'}>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={form.ativo}
                disabled={salvando}
                onChange={(e) => void salvar({ ativo: e.target.checked })}
                aria-label="Ligar assistente"
              />
              <span className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-green-600 dark:bg-zinc-700" />
              <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </label>
          </div>
        </div>
      </div>

      <Secao
        icon={<SlidersHorizontal size={18} />}
        titulo="Comportamento"
        descricao="Como o assistente se apresenta e quando ele entra na conversa."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={labelClass}>
            Nome do assistente
            <input
              className={inputClass}
              value={form.nome_assistente}
              maxLength={60}
              onChange={(e) => set('nome_assistente', e.target.value)}
              placeholder="Assistente virtual"
            />
            <span className={dicaClass}>Aparece em negrito no topo de cada resposta.</span>
          </label>
          <label className={labelClass}>
            Quando responder
            <select
              className={inputClass}
              value={form.modo_resposta}
              onChange={(e) => set('modo_resposta', e.target.value as ConfigForm['modo_resposta'])}
            >
              <option value="sempre">Sempre, até um atendente responder</option>
              <option value="sem_atendente">Só conversas sem atendente responsável</option>
            </select>
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Pausa depois que um atendente responde
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={1440}
                className={`${inputClass} mt-0 w-24`}
                value={form.pausa_apos_humano_min}
                onChange={(e) => set('pausa_apos_humano_min', Number(e.target.value))}
              />
              <span className="text-sm font-normal text-gray-600 dark:text-zinc-400">minutos sem a IA responder</span>
            </div>
          </label>
        </div>
      </Secao>

      <Secao
        icon={<Store size={18} />}
        titulo="Dados da assistência"
        descricao="O básico que o cliente costuma perguntar. A IA só responde com o que estiver aqui."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className={`${labelClass} sm:col-span-2`}>
            Endereço
            <input
              className={inputClass}
              value={form.endereco ?? ''}
              onChange={(e) => set('endereco', e.target.value)}
              placeholder={enderecoEmpresa || 'Rua, número, bairro, cidade'}
            />
            {!form.endereco && enderecoEmpresa && (
              <span className={dicaClass}>Em branco, usa o endereço do cadastro da empresa.</span>
            )}
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Horário de funcionamento
            <textarea
              rows={2}
              className={`${inputClass} resize-none`}
              value={form.horario_funcionamento ?? ''}
              onChange={(e) => set('horario_funcionamento', e.target.value)}
              placeholder="Seg a sex das 9h às 18h, sábado das 9h às 13h. Fechado domingo e feriados."
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Serviços que a loja faz
            <textarea
              rows={3}
              className={`${inputClass} resize-none`}
              value={form.servicos ?? ''}
              onChange={(e) => set('servicos', e.target.value)}
              placeholder="Troca de tela, bateria e conector de celulares; reparo de placa; notebooks; videogames..."
            />
            <span className={dicaClass}>Vale dizer também o que a loja não faz.</span>
          </label>
          <label className={labelClass}>
            Formas de pagamento
            <textarea
              rows={2}
              className={`${inputClass} resize-none`}
              value={form.formas_pagamento ?? ''}
              onChange={(e) => set('formas_pagamento', e.target.value)}
              placeholder="Pix, dinheiro, débito e crédito em até 10x"
            />
          </label>
          <label className={labelClass}>
            Garantia
            <textarea
              rows={2}
              className={`${inputClass} resize-none`}
              value={form.garantia ?? ''}
              onChange={(e) => set('garantia', e.target.value)}
              placeholder="90 dias em peças e serviço"
            />
          </label>
        </div>
      </Secao>

      <Secao
        icon={<MessageCircleQuestion size={18} />}
        titulo="Perguntas frequentes"
        descricao="Respostas prontas para o que os clientes mais perguntam."
        acao={
          <button
            type="button"
            onClick={() => set('faq', [...form.faq, { pergunta: '', resposta: '' }])}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Plus size={15} /> Adicionar
          </button>
        }
      >
        {form.faq.length === 0 ? (
          <button
            type="button"
            onClick={() => set('faq', [{ pergunta: '', resposta: '' }])}
            className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 hover:border-green-400 hover:text-green-700 dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-green-700 dark:hover:text-green-400"
          >
            <span className="block font-medium">Nenhuma pergunta cadastrada</span>
            <span className="mt-1 block text-xs">
              Ex.: &quot;Vocês fazem orçamento grátis?&quot; → &quot;Sim, o orçamento é gratuito e sai em até 24h.&quot;
            </span>
          </button>
        ) : (
          <div className="space-y-3">
            {form.faq.map((f, i) => (
              <div
                key={i}
                className="group rounded-lg border border-gray-200 bg-gray-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-500 ring-1 ring-gray-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-700">
                    {i + 1}
                  </span>
                  <input
                    className={`${inputClass} mt-0 font-medium`}
                    value={f.pergunta}
                    onChange={(e) => setFaq(i, 'pergunta', e.target.value)}
                    placeholder="Pergunta do cliente"
                  />
                  <button
                    type="button"
                    onClick={() => set('faq', form.faq.filter((_, idx) => idx !== i))}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    aria-label="Remover pergunta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="pl-8 pr-10">
                  <textarea
                    rows={2}
                    className={`${inputClass} resize-none`}
                    value={f.resposta}
                    onChange={(e) => setFaq(i, 'resposta', e.target.value)}
                    placeholder="Resposta"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Secao>

      <Secao
        icon={<NotebookPen size={18} />}
        titulo="Instruções extras"
        descricao="Escreva como se estivesse treinando um atendente novo."
      >
        <textarea
          rows={5}
          className={`${inputClass} mt-0`}
          value={form.instrucoes ?? ''}
          onChange={(e) => set('instrucoes', e.target.value)}
          placeholder={
            '- Sempre convide o cliente a trazer o aparelho para orçamento.\n- Temos estacionamento em frente à loja.\n- Não atendemos iPhone com placa danificada por água.'
          }
        />
      </Secao>

      <div className="flex items-center justify-end gap-3">
        {erro && <span className="text-sm text-red-600 dark:text-red-400">{erro}</span>}
        {salvoEm && !alterado && !erro && (
          <span className="inline-flex items-center gap-1 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 size={15} /> Salvo às {salvoEm}
          </span>
        )}
        <button
          type="button"
          onClick={() => void salvar()}
          disabled={salvando || !alterado}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          <Save size={16} />
          {salvando ? 'Salvando...' : 'Salvar treinamento'}
        </button>
      </div>

      {alterado && (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 md:pl-64">
          <div className="flex items-center gap-4 rounded-full border border-gray-200 bg-white py-2 pl-5 pr-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            <span className="text-sm text-gray-700 dark:text-zinc-300">
              {erro ? <span className="text-red-600 dark:text-red-400">{erro}</span> : 'Alterações não salvas'}
            </span>
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando}
              className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Save size={15} />
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {!testeAberto && (
        <button
          type="button"
          onClick={() => setTesteAberto(true)}
          className="fixed bottom-24 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#00a884] px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-[#019a78]"
        >
          <Sparkles size={16} />
          Testar assistente
        </button>
      )}

      {testeAberto && (
        <aside className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-gray-200 bg-white shadow-2xl sm:w-[400px] dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between bg-[#008069] px-4 py-3 text-white dark:bg-[#202c33]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{form.nome_assistente || 'Assistente virtual'}</p>
                <p className="text-[11px] opacity-80">Teste com o que está no formulário, mesmo sem salvar</p>
              </div>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setTeste([])}
                className="rounded-full p-2 hover:bg-white/10"
                aria-label="Recomeçar teste"
                title="Recomeçar"
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                onClick={() => setTesteAberto(false)}
                className="rounded-full p-2 hover:bg-white/10"
                aria-label="Fechar teste"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-[#efeae2] px-3 py-4 dark:bg-[#0b141a]">
            {teste.length === 0 && (
              <div className="mx-auto mt-4 max-w-[300px] space-y-3 text-center">
                <p className="rounded-lg bg-white/80 px-3 py-2 text-xs text-gray-600 dark:bg-[#182229] dark:text-zinc-400">
                  Escreva como se fosse um cliente ou escolha uma pergunta:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGESTOES_TESTE.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void enviarTeste(s)}
                      className="rounded-full bg-white px-3 py-1.5 text-xs text-[#008069] shadow-sm hover:bg-gray-50 dark:bg-[#202c33] dark:text-[#53bdeb] dark:hover:bg-[#2a3942]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {teste.map((m, i) => (
              <div key={i} className={`flex ${m.direcao === 'entrada' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-1.5 text-[14px] leading-snug shadow-sm ${
                    m.direcao === 'entrada'
                      ? 'bg-white text-gray-900 dark:bg-[#202c33] dark:text-zinc-100'
                      : 'bg-[#d9fdd3] text-gray-900 dark:bg-[#005c4b] dark:text-zinc-100'
                  }`}
                >
                  {m.direcao === 'saida' && (
                    <p className="mb-0.5 text-[12.5px] font-semibold text-[#027eb5] dark:text-[#53bdeb]">
                      {form.nome_assistente || 'Assistente virtual'}
                    </p>
                  )}
                  {m.conteudo}
                  {m.transferir && (
                    <p className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      → Transferiria para um atendente
                    </p>
                  )}
                </div>
              </div>
            ))}
            {testando && (
              <div className="flex justify-end">
                <div className="rounded-lg bg-[#d9fdd3] px-3 py-2 text-sm text-gray-500 dark:bg-[#005c4b] dark:text-zinc-300">
                  digitando...
                </div>
              </div>
            )}
            <div ref={fimTesteRef} />
          </div>

          <div className="flex items-center gap-2 bg-[#f0f2f5] px-3 py-2.5 dark:bg-[#202c33]">
            <input
              ref={inputTesteRef}
              className="flex-1 rounded-lg bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none dark:bg-[#2a3942] dark:text-zinc-100"
              placeholder="Mensagem do cliente"
              value={textoTeste}
              onChange={(e) => setTextoTeste(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void enviarTeste();
                }
              }}
            />
            <button
              type="button"
              onClick={() => void enviarTeste()}
              disabled={!textoTeste.trim() || testando}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-40"
              aria-label="Enviar mensagem de teste"
            >
              <Send size={16} />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
