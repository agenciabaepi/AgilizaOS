'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Plus, Trash2, Send, RotateCcw, Save, Sparkles } from 'lucide-react';
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
  'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-zinc-300';
const cardClass =
  'rounded-xl border border-gray-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60';

export function AssistenteIAConfig() {
  const [form, setForm] = useState<ConfigForm | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaBasica | null>(null);
  const [iaDisponivel, setIaDisponivel] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [teste, setTeste] = useState<MsgTeste[]>([]);
  const [textoTeste, setTextoTeste] = useState('');
  const [testando, setTestando] = useState(false);
  const fimTesteRef = useRef<HTMLDivElement>(null);

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

  if (!form) {
    return <p className="text-sm text-gray-500 dark:text-zinc-400">{erro ?? 'Carregando...'}</p>;
  }

  const set = <K extends keyof ConfigForm>(campo: K, valor: ConfigForm[K]) => {
    setForm((f) => (f ? { ...f, [campo]: valor } : f));
    setSalvoEm(null);
  };

  const setFaq = (i: number, campo: keyof WhatsAppIaFaqItem, valor: string) => {
    set(
      'faq',
      form.faq.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f))
    );
  };

  const enderecoEmpresa = [empresa?.endereco, empresa?.cidade].filter(Boolean).join(' - ');

  async function salvar() {
    if (!form) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await whatsappCrmFetch('/api/whatsapp/crm/ia', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) {
        setErro(json.error || 'Erro ao salvar');
        return;
      }
      setSalvoEm(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setSalvando(false);
    }
  }

  async function enviarTeste() {
    const conteudo = textoTeste.trim();
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
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        {!iaDisponivel && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            A chave da OpenAI não está configurada no servidor. O assistente não vai responder até ela ser
            configurada.
          </div>
        )}

        <div className={`${cardClass} flex items-start justify-between gap-4`}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400">
              <Bot size={20} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-zinc-100">Assistente IA no WhatsApp</p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-zinc-400">
                Responde clientes automaticamente com as informações abaixo. Quando não souber ou o cliente
                pedir uma pessoa, chama um atendente.
              </p>
            </div>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={form.ativo}
              onChange={(e) => set('ativo', e.target.checked)}
            />
            <span className="h-6 w-11 rounded-full bg-gray-300 transition peer-checked:bg-green-600 dark:bg-zinc-700" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </label>
        </div>

        <div className={`${cardClass} grid gap-4 sm:grid-cols-2`}>
          <label className={labelClass}>
            Nome do assistente
            <input
              className={inputClass}
              value={form.nome_assistente}
              maxLength={60}
              onChange={(e) => set('nome_assistente', e.target.value)}
              placeholder="Assistente virtual"
            />
            <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-zinc-500">
              Aparece em negrito no topo de cada resposta.
            </span>
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
            Depois que um atendente responde, a IA fica em silêncio por
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={1440}
                className={`${inputClass} mt-0 w-28`}
                value={form.pausa_apos_humano_min}
                onChange={(e) => set('pausa_apos_humano_min', Number(e.target.value))}
              />
              <span className="text-sm font-normal text-gray-600 dark:text-zinc-400">minutos</span>
            </div>
          </label>
        </div>

        <div className={`${cardClass} space-y-4`}>
          <p className="font-semibold text-gray-900 dark:text-zinc-100">Dados da assistência</p>
          <label className={labelClass}>
            Endereço
            <input
              className={inputClass}
              value={form.endereco ?? ''}
              onChange={(e) => set('endereco', e.target.value)}
              placeholder={enderecoEmpresa || 'Rua, número, bairro, cidade'}
            />
            {!form.endereco && enderecoEmpresa && (
              <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-zinc-500">
                Em branco, usa o endereço do cadastro da empresa.
              </span>
            )}
          </label>
          <label className={labelClass}>
            Horário de funcionamento
            <textarea
              rows={2}
              className={inputClass}
              value={form.horario_funcionamento ?? ''}
              onChange={(e) => set('horario_funcionamento', e.target.value)}
              placeholder="Seg a sex das 9h às 18h, sábado das 9h às 13h. Fechado domingo e feriados."
            />
          </label>
          <label className={labelClass}>
            Serviços que a loja faz
            <textarea
              rows={3}
              className={inputClass}
              value={form.servicos ?? ''}
              onChange={(e) => set('servicos', e.target.value)}
              placeholder="Troca de tela, bateria e conector de celulares; reparo de placa; notebooks; videogames..."
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Formas de pagamento
              <textarea
                rows={2}
                className={inputClass}
                value={form.formas_pagamento ?? ''}
                onChange={(e) => set('formas_pagamento', e.target.value)}
                placeholder="Pix, dinheiro, débito e crédito em até 10x"
              />
            </label>
            <label className={labelClass}>
              Garantia
              <textarea
                rows={2}
                className={inputClass}
                value={form.garantia ?? ''}
                onChange={(e) => set('garantia', e.target.value)}
                placeholder="90 dias em peças e serviço"
              />
            </label>
          </div>
        </div>

        <div className={`${cardClass} space-y-3`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900 dark:text-zinc-100">Perguntas frequentes</p>
              <p className="text-sm text-gray-600 dark:text-zinc-400">
                Ensine respostas prontas para o que os clientes mais perguntam.
              </p>
            </div>
            <button
              type="button"
              onClick={() => set('faq', [...form.faq, { pergunta: '', resposta: '' }])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <Plus size={15} /> Adicionar
            </button>
          </div>
          {form.faq.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-500 dark:border-zinc-700 dark:text-zinc-500">
              Ex.: &quot;Vocês fazem orçamento grátis?&quot; → &quot;Sim, o orçamento é gratuito e sai em até 24h.&quot;
            </p>
          )}
          {form.faq.map((f, i) => (
            <div
              key={i}
              className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
            >
              <div className="flex items-center gap-2">
                <input
                  className={`${inputClass} mt-0`}
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
              <textarea
                rows={2}
                className={`${inputClass} mt-0`}
                value={f.resposta}
                onChange={(e) => setFaq(i, 'resposta', e.target.value)}
                placeholder="Resposta"
              />
            </div>
          ))}
        </div>

        <div className={cardClass}>
          <label className={labelClass}>
            Instruções extras para a IA
            <textarea
              rows={5}
              className={inputClass}
              value={form.instrucoes ?? ''}
              onChange={(e) => set('instrucoes', e.target.value)}
              placeholder={
                'Escreva como se estivesse treinando um atendente novo. Ex.:\n- Sempre convide o cliente a trazer o aparelho para orçamento.\n- Temos estacionamento em frente à loja.\n- Não atendemos iPhone com placa danificada por água.'
              }
            />
          </label>
        </div>

        <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-end gap-3 bg-gradient-to-t from-white via-white/95 px-1 py-3 dark:from-zinc-950 dark:via-zinc-950/95">
          {erro && <span className="text-sm text-red-600 dark:text-red-400">{erro}</span>}
          {salvoEm && !erro && (
            <span className="text-sm text-green-700 dark:text-green-400">Salvo às {salvoEm}</span>
          )}
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={salvando}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Save size={16} />
            {salvando ? 'Salvando...' : 'Salvar treinamento'}
          </button>
        </div>
      </div>

      <div className="2xl:sticky 2xl:top-4 2xl:self-start">
        <div className="flex h-[480px] 2xl:h-[560px] flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center justify-between bg-[#008069] px-4 py-3 text-white dark:bg-[#202c33]">
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <div>
                <p className="text-sm font-semibold leading-tight">Testar assistente</p>
                <p className="text-[11px] opacity-80">Usa o que está no formulário, mesmo sem salvar</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTeste([])}
              className="rounded-full p-1.5 hover:bg-white/10"
              aria-label="Recomeçar teste"
              title="Recomeçar"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-[#efeae2] px-3 py-3 dark:bg-[#0b141a]">
            {teste.length === 0 && (
              <p className="mx-auto mt-6 max-w-[260px] rounded-lg bg-white/80 px-3 py-2 text-center text-xs text-gray-600 dark:bg-[#182229] dark:text-zinc-400">
                Escreva como se fosse um cliente: &quot;oi, que horas vocês abrem?&quot;
              </p>
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

          <div className="flex items-center gap-2 bg-[#f0f2f5] px-3 py-2 dark:bg-[#202c33]">
            <input
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
        </div>
      </div>
    </div>
  );
}
