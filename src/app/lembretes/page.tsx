'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useCallback, useMemo, useId } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { format } from 'date-fns';
import 'react-toastify/dist/ReactToastify.css';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  pointerWithin,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Book,
  Pencil,
  GripVertical,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  ListTodo,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';

function formatarData(data: string) {
  try {
    return format(new Date(data), 'dd/MM/yyyy');
  } catch {
    return '';
  }
}

export interface ChecklistItem {
  id: string;
  label: string;
  concluido: boolean;
}

interface Nota {
  id: string;
  titulo: string;
  texto: string;
  cor: string;
  coluna: string;
  prioridade: string;
  data_criacao: string;
  pos_x: number;
  pos_y: number;
  empresa_id: string;
  responsavel: string;
  checklist?: ChecklistItem[];
}

interface NotaEditando {
  id: string;
  titulo: string;
  texto: string;
  cor: string;
  coluna: string;
  prioridade: string;
  data: string;
  data_criacao: string;
  checklist?: ChecklistItem[];
}

interface NotaSelecionada {
  id: string;
  titulo: string;
  texto: string;
  cor: string;
  coluna: string;
  prioridade: string;
}

const CORES = [
  { cor: 'bg-amber-400', ring: 'ring-amber-500' },
  { cor: 'bg-emerald-400', ring: 'ring-emerald-500' },
  { cor: 'bg-sky-400', ring: 'ring-sky-500' },
  { cor: 'bg-violet-400', ring: 'ring-violet-500' },
  { cor: 'bg-rose-400', ring: 'ring-rose-500' },
];

function parseChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x.id === 'string' && typeof x.label === 'string' && typeof x.concluido === 'boolean')
    .map((x) => ({ id: x.id, label: x.label, concluido: x.concluido }));
}

function progressoChecklist(items: ChecklistItem[]): { concluidos: number; total: number } {
  const total = items.length;
  if (total === 0) return { concluidos: 0, total: 0 };
  const concluidos = items.filter((i) => i.concluido).length;
  return { concluidos, total };
}

export default function LembretesPage() {
  const { session, user, usuarioData, empresaData } = useAuth();
  const empresa_id = empresaData?.id;
  const { addToast } = useToast();
  const confirm = useConfirm();

  const [notes, setNotes] = useState<Nota[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalColunaAberta, setModalColunaAberta] = useState<null | { index: number; valor: string }>(null);
  const [showModal, setShowModal] = useState(false);
  const [novaNota, setNovaNota] = useState({
    titulo: '',
    texto: '',
    cor: 'bg-amber-400',
    coluna: 'lembretes',
    prioridade: 'Média',
    checklist: [] as ChecklistItem[],
  });
  const [notaEditando, setNotaEditando] = useState<NotaEditando | null>(null);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaSelecionada | null>(null);
  const [exibirExcluirNotaModal, setExibirExcluirNotaModal] = useState(false);
  const [activeDrag, setActiveDrag] = useState<{ id: string; type: 'coluna' | 'nota' } | null>(null);

  useEffect(() => {
    if (usuarioData !== undefined) setCarregando(false);
  }, [usuarioData]);

  const fetchColunas = useCallback(async () => {
    if (!empresa_id) return;
    const { data, error } = await supabase
      .from('colunas_dashboard')
      .select('nome')
      .eq('empresa_id', empresa_id)
      .order('posicao', { ascending: true });
    if (!error && data && data.length > 0) {
      setColunas(data.map((c: { nome: string }) => c.nome));
    }
  }, [empresa_id]);

  const fetchNotas = useCallback(async () => {
    if (!empresa_id) return;
    const { data, error } = await supabase
      .from('notas_dashboard')
      .select('*')
      .eq('empresa_id', empresa_id);
    if (!error && data) {
      setNotes(
        data.map((n: Record<string, unknown>) => ({
          ...n,
          checklist: parseChecklist(n.checklist ?? []),
        }))
      );
    }
  }, [empresa_id]);

  useEffect(() => {
    fetchColunas();
  }, [fetchColunas]);

  useEffect(() => {
    fetchNotas();
  }, [fetchNotas]);

  const criarColuna = useCallback(
    async (titulo: string) => {
      if (!empresa_id) {
        addToast('error', 'Empresa não identificada.');
        return;
      }
      if (!titulo.trim()) return;
      const colunaData = { nome: titulo.trim(), empresa_id, posicao: colunas.length };
      const { error } = await supabase.from('colunas_dashboard').insert([colunaData]).select();
      if (error) {
        addToast('error', `Erro ao criar coluna: ${error.message}`);
        return;
      }
      addToast('success', 'Coluna criada!');
      await fetchColunas();
    },
    [empresa_id, colunas.length, fetchColunas, addToast]
  );

  const removerColuna = useCallback(
    async (coluna: string) => {
      if (!empresa_id || !coluna) return;
      const { error } = await supabase
        .from('colunas_dashboard')
        .delete()
        .eq('empresa_id', empresa_id)
        .eq('nome', coluna);
      if (error) {
        addToast('error', 'Erro ao excluir coluna.');
        return;
      }
      addToast('success', 'Coluna excluída.');
      setColunas((p) => p.filter((c) => c !== coluna));
      setNotes((p) => p.filter((n) => n.coluna !== coluna));
    },
    [empresa_id, addToast]
  );

  const salvarColunasNoBanco = useCallback(
    async (novaOrdem: string[]) => {
      if (!empresa_id) return;
      const { data: colunasExistentes, error: erroBusca } = await supabase
        .from('colunas_dashboard')
        .select('id, nome')
        .eq('empresa_id', empresa_id);
      if (erroBusca) {
        addToast('error', 'Erro ao atualizar ordem.');
        return;
      }
      for (let i = 0; i < novaOrdem.length; i++) {
        const nome = novaOrdem[i];
        const row = colunasExistentes?.find((c: { nome: string }) => c.nome === nome);
        if (row) {
          await supabase.from('colunas_dashboard').update({ posicao: i }).eq('id', row.id);
        }
      }
    },
    [empresa_id, addToast]
  );

  const editarColuna = useCallback(
    async (colunaId: string, novoNome: string, nomeAntigo: string) => {
      const { error: colunaError } = await supabase
        .from('colunas_dashboard')
        .update({ nome: novoNome })
        .eq('id', colunaId);
      if (colunaError) {
        addToast('error', `Erro ao renomear: ${colunaError.message}`);
        return;
      }
      await supabase.from('notas_dashboard').update({ coluna: novoNome }).eq('coluna', nomeAntigo);
      addToast('success', 'Coluna atualizada.');
      setColunas((p) => p.map((c) => (c === nomeAntigo ? novoNome : c)));
      setNotes((p) => p.map((n) => (n.coluna === nomeAntigo ? { ...n, coluna: novoNome } : n)));
    },
    [addToast]
  );

  const salvarTituloColuna = useCallback(
    async (index: number, novoNome: string) => {
      if (!empresa_id) return;
      const nomeAtual = colunas[index];
      const { data } = await supabase
        .from('colunas_dashboard')
        .select('id, nome')
        .eq('empresa_id', empresa_id)
        .eq('nome', nomeAtual)
        .maybeSingle();
      if (data?.id) {
        await editarColuna(data.id, novoNome, data.nome);
      } else {
        addToast('error', 'Coluna não encontrada.');
      }
    },
    [empresa_id, colunas, editarColuna, addToast]
  );

  const salvarOuAtualizarNota = useCallback(async () => {
    const empresaId = empresaData?.id;
    if (!empresaId || !novaNota.titulo.trim()) return;

    const checklist = novaNota.checklist ?? [];

    if (!notaEditando?.id) {
      const novaNotaObj = {
        id: uuidv4(),
        titulo: novaNota.titulo.trim(),
        texto: novaNota.texto,
        cor: novaNota.cor,
        coluna: novaNota.coluna,
        prioridade: novaNota.prioridade,
        empresa_id: empresaId,
        responsavel: session?.user?.email ?? '',
        data_criacao: new Date().toISOString(),
        pos_x: 0,
        pos_y: 0,
        checklist,
      };
      const { error } = await supabase.from('notas_dashboard').insert([novaNotaObj]).select();
      if (error) {
        addToast('error', `Erro ao salvar: ${error.message}`);
        return;
      }
      setNotes((p) => [{ ...novaNotaObj, checklist: parseChecklist(checklist) } as Nota, ...p]);
      addToast('success', 'Nota criada!');
      setShowModal(false);
      setNovaNota({ titulo: '', texto: '', cor: 'bg-amber-400', coluna: 'lembretes', prioridade: 'Média', checklist: [] });
      setNotaEditando(null);
      return;
    }

    const dados = {
      titulo: novaNota.titulo.trim(),
      texto: novaNota.texto,
      prioridade: novaNota.prioridade,
      cor: novaNota.cor,
      coluna: novaNota.coluna,
      checklist,
    };
    const { error } = await supabase.from('notas_dashboard').update(dados).eq('id', notaEditando.id).select();
    if (error) {
      addToast('error', `Erro ao atualizar: ${error.message}`);
      return;
    }
    addToast('success', 'Nota atualizada!');
    setNotes((p) =>
      p.map((n) =>
        n.id === notaEditando.id
          ? { ...n, ...dados, checklist: parseChecklist(checklist) }
          : n
      )
    );
    setShowModal(false);
    setNovaNota({ titulo: '', texto: '', cor: 'bg-amber-400', coluna: 'lembretes', prioridade: 'Média', checklist: [] });
    setNotaEditando(null);
  }, [empresaData?.id, session?.user?.email, novaNota, notaEditando, addToast]);

  const toggleChecklistItem = useCallback(
    async (notaId: string, itemId: string) => {
      const nota = notes.find((n) => n.id === notaId);
      if (!nota) return;
      const list = parseChecklist(nota.checklist ?? []);
      const next = list.map((i) => (i.id === itemId ? { ...i, concluido: !i.concluido } : i));
      const { error } = await supabase.from('notas_dashboard').update({ checklist: next }).eq('id', notaId);
      if (error) {
        addToast('error', 'Erro ao atualizar item.');
        return;
      }
      setNotes((p) =>
        p.map((n) => (n.id === notaId ? { ...n, checklist: next } : n))
      );
    },
    [notes, addToast]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith('coluna-')) {
      setActiveDrag({ id, type: 'coluna' });
    } else {
      setActiveDrag({ id, type: 'nota' });
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDrag(null);
      if (!over || active.id === over.id) return;

      const idStr = (x: string) => String(x);
      const isColuna = (id: string) => id.startsWith('coluna-');
      const isDropColuna = (id: string) => id.startsWith('drop-coluna-');
      const getColunaFromId = (id: string) => id.replace('coluna-', '').replace('drop-coluna-', '');

      if (isColuna(idStr(active.id)) && (isColuna(idStr(over.id)) || isDropColuna(idStr(over.id)))) {
        const overColunaId = isColuna(idStr(over.id)) ? idStr(over.id) : `coluna-${getColunaFromId(idStr(over.id))}`;
        const ai = colunas.findIndex((c) => `coluna-${c}` === idStr(active.id));
        const oi = colunas.findIndex((c) => `coluna-${c}` === overColunaId);
        if (ai === -1 || oi === -1) return;
        const novas = arrayMove(colunas, ai, oi);
        setColunas(novas);
        await salvarColunasNoBanco(novas);
        return;
      }

      const notaMovida = notes.find((n) => n.id === idStr(active.id));
      if (!notaMovida) return;

      const overId = idStr(over.id);
      let novaColuna: string;
      let notasNaColuna: Nota[];

      if (isColuna(overId) || isDropColuna(overId)) {
        novaColuna = getColunaFromId(overId);
        notasNaColuna = notes.filter((n) => n.coluna === novaColuna).sort((a, b) => a.pos_x - b.pos_x);
      } else {
        const notaAlvo = notes.find((n) => n.id === overId);
        if (!notaAlvo) return;
        novaColuna = notaAlvo.coluna;
        notasNaColuna = notes.filter((n) => n.coluna === novaColuna).sort((a, b) => a.pos_x - b.pos_x);
      }

      const notaAtualizada = { ...notaMovida, coluna: novaColuna };
      const restante = notasNaColuna.filter((n) => n.id !== notaMovida.id);
      const overIndex = restante.findIndex((n) => n.id === overId);
      const insertIndex = overIndex === -1 ? restante.length : overIndex;
      const reordenada = [...restante];
      reordenada.splice(insertIndex, 0, notaAtualizada);
      const comPos = reordenada.map((n, i) => ({ ...n, pos_x: i }));

      setNotes((prev) => {
        const outros = prev.filter((n) => n.coluna !== novaColuna);
        return [...outros, ...comPos].sort((a, b) => (a.coluna !== b.coluna ? 0 : a.pos_x - b.pos_x));
      });

      for (const n of comPos) {
        await supabase.from('notas_dashboard').update({ pos_x: n.pos_x, coluna: n.coluna }).eq('id', n.id);
      }
    },
    [colunas, notes, salvarColunasNoBanco]
  );

  const excluirNota = useCallback(
    async (idNota: string) => {
      const { error } = await supabase.from('notas_dashboard').delete().eq('id', idNota);
      if (error) throw error;
      setNotes((p) => p.filter((n) => n.id !== idNota));
      addToast('success', 'Nota excluída.');
    },
    [addToast]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  if (carregando || !session?.user) {
    return (
      <MenuLayout>
        <div className="flex items-center justify-center min-h-[320px]">
          <div className="animate-pulse text-zinc-500">Carregando...</div>
        </div>
      </MenuLayout>
    );
  }

  return (
    <MenuLayout>
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-amber-50/30">
        <div className="p-6 max-w-[1600px] mx-auto">
          <header className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-800 flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <Book className="w-6 h-6" />
              </span>
              Lembretes
            </h1>
            <p className="text-zinc-500 mt-1">Organize suas tarefas e anotações em colunas. Arraste os cards para mover.</p>
          </header>

          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={colunas.map((c) => `coluna-${c}`)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-4 overflow-x-auto pb-4 min-h-[420px]">
                {colunas.map((coluna, index) => {
                  const notasDaColuna = notes.filter((n) => n.coluna === coluna).sort((a, b) => a.pos_x - b.pos_x);
                  let concluidos = 0,
                    total = 0;
                  notasDaColuna.forEach((n) => {
                    const list = n.checklist ?? [];
                    if (list.length) {
                      total += list.length;
                      concluidos += list.filter((i) => i.concluido).length;
                    } else {
                      total += 1;
                      concluidos += 1;
                    }
                  });
                  const percentual = total ? Math.round((concluidos / total) * 100) : 0;

                  return (
                    <ColunaKanban
                      key={coluna}
                      id={coluna}
                      index={index}
                      titulo={coluna}
                      notas={notasDaColuna}
                      percentual={percentual}
                      totalNotas={notasDaColuna.length}
                      colunas={colunas}
                      onEditarTitulo={() => setModalColunaAberta({ index, valor: coluna })}
                      onNovaNota={() => {
                        setNovaNota((prev) => ({ ...prev, coluna, checklist: [] }));
                        setNotaEditando(null);
                        setShowModal(true);
                      }}
                      onExcluirColuna={async () => {
                        const ok = await confirm({
                          title: 'Excluir coluna',
                          message: `Excluir a coluna "${coluna}"? As notas serão removidas.`,
                          confirmText: 'Excluir',
                          cancelText: 'Cancelar',
                        });
                        if (ok) {
                          await removerColuna(coluna);
                        }
                      }}
                      onAbrirEditarNota={(nota) => {
                        setNovaNota({
                          titulo: nota.titulo,
                          texto: nota.texto,
                          cor: nota.cor,
                          coluna: nota.coluna,
                          prioridade: nota.prioridade ?? 'Média',
                          checklist: parseChecklist(nota.checklist ?? []),
                        });
                        setNotaEditando({
                          id: nota.id,
                          titulo: nota.titulo,
                          texto: nota.texto,
                          cor: nota.cor,
                          coluna: nota.coluna,
                          prioridade: nota.prioridade ?? 'Média',
                          data: nota.data_criacao,
                          data_criacao: nota.data_criacao,
                          checklist: parseChecklist(nota.checklist ?? []),
                        });
                        setShowModal(true);
                      }}
                      onToggleChecklist={toggleChecklistItem}
                      salvarTituloColuna={salvarTituloColuna}
                      confirm={confirm}
                      excluirNota={excluirNota}
                      setNotaSelecionada={setNotaSelecionada}
                      setExibirExcluirNotaModal={setExibirExcluirNotaModal}
                    />
                  );
                })}

                <div className="flex-shrink-0 w-72">
                  <button
                    type="button"
                    onClick={() => {
                      const nome = window.prompt('Nome da nova coluna');
                      if (nome?.trim() && !colunas.includes(nome.trim())) {
                        criarColuna(nome.trim());
                      }
                    }}
                    className="w-full h-full min-h-[380px] rounded-2xl border-2 border-dashed border-zinc-300 text-zinc-500 hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-700 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <Plus className="w-8 h-8" />
                    <span className="font-medium">Nova coluna</span>
                  </button>
                </div>
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={null}>
              {activeDrag?.type === 'coluna' && (() => {
                const nome = activeDrag.id.replace('coluna-', '');
                const notasCol = notes.filter((n) => n.coluna === nome).sort((a, b) => a.pos_x - b.pos_x);
                let concluidos = 0, total = 0;
                notasCol.forEach((n) => {
                  const list = n.checklist ?? [];
                  if (list.length) {
                    total += list.length;
                    concluidos += list.filter((i) => i.concluido).length;
                  } else {
                    total += 1;
                    concluidos += 1;
                  }
                });
                const percentual = total ? Math.round((concluidos / total) * 100) : 0;
                return (
                  <div className="flex-shrink-0 w-72 flex flex-col rounded-2xl border-2 border-amber-400 bg-white shadow-xl overflow-hidden opacity-95">
                    <div className="p-4 border-b border-zinc-100 bg-amber-50/50">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-zinc-400" />
                        <h3 className="font-semibold text-zinc-800 truncate">{nome}</h3>
                        <span className="text-xs text-zinc-400 bg-zinc-200 rounded-full px-2 py-0.5">{notasCol.length}</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percentual}%` }} />
                      </div>
                    </div>
                    <div className="p-3 min-h-[80px] bg-zinc-50/50" />
                  </div>
                );
              })()}
              {activeDrag?.type === 'nota' && (() => {
                const nota = notes.find((n) => n.id === activeDrag.id);
                if (!nota) return null;
                const checklist = nota.checklist ?? [];
                const { concluidos, total } = progressoChecklist(checklist);
                return (
                  <div className="rounded-xl border-2 border-amber-400 bg-white shadow-xl overflow-hidden w-72 opacity-95 cursor-grabbing">
                    <div className="flex">
                      <div className={`w-1 flex-shrink-0 ${nota.cor}`} />
                      <div className="flex-1 p-3 min-w-0">
                        <p className="font-semibold text-zinc-800 truncate">{nota.titulo}</p>
                        {nota.texto && <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{nota.texto}</p>}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs text-zinc-400">{formatarData(nota.data_criacao)}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            nota.prioridade === 'Alta' ? 'bg-rose-100 text-rose-700' : nota.prioridade === 'Média' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>{nota.prioridade}</span>
                          {total > 0 && <span className="text-xs text-zinc-500">{concluidos}/{total}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {showModal && (
        <EditarNotaModal
          notaEditando={notaEditando}
          novaNota={novaNota}
          setNovaNota={setNovaNota}
          setShowModal={setShowModal}
          salvarOuAtualizarNota={salvarOuAtualizarNota}
          onClose={() => {
            setShowModal(false);
            setNovaNota({ titulo: '', texto: '', cor: 'bg-amber-400', coluna: 'lembretes', prioridade: 'Média', checklist: [] });
            setNotaEditando(null);
          }}
          setExibirExcluirNotaModal={setExibirExcluirNotaModal}
          setNotaSelecionada={setNotaSelecionada}
          colunas={colunas}
        />
      )}

      {modalColunaAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-zinc-200">
            <h2 className="text-lg font-semibold text-zinc-800 mb-4">Editar nome da coluna</h2>
            <input
              type="text"
              value={modalColunaAberta.valor}
              onChange={(e) => setModalColunaAberta((m) => (m ? { ...m, valor: e.target.value } : m))}
              className="w-full border border-zinc-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 text-sm font-medium"
                onClick={() => setModalColunaAberta(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-sm font-medium"
                onClick={async () => {
                  const { index, valor } = modalColunaAberta;
                  if (valor.trim() && valor !== colunas[index]) {
                    setColunas((p) => {
                      const next = [...p];
                      next[index] = valor.trim();
                      return next;
                    });
                    await salvarTituloColuna(index, valor.trim());
                  }
                  setModalColunaAberta(null);
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <ExcluirNotaModal
        isOpen={exibirExcluirNotaModal}
        onClose={() => {
          setExibirExcluirNotaModal(false);
          setNotaSelecionada(null);
        }}
        onConfirm={async () => {
          if (notaSelecionada) {
            await excluirNota(notaSelecionada.id);
            setExibirExcluirNotaModal(false);
            setNotaSelecionada(null);
          }
        }}
      />
    </MenuLayout>
  );
}

function ColunaKanban({
  id,
  index,
  titulo,
  notas,
  percentual,
  totalNotas,
  colunas,
  onEditarTitulo,
  onNovaNota,
  onExcluirColuna,
  onAbrirEditarNota,
  onToggleChecklist,
  salvarTituloColuna,
  confirm,
  excluirNota,
  setNotaSelecionada,
  setExibirExcluirNotaModal,
}: {
  id: string;
  index: number;
  titulo: string;
  notas: Nota[];
  percentual: number;
  totalNotas: number;
  colunas: string[];
  onEditarTitulo: () => void;
  onNovaNota: () => void;
  onExcluirColuna: () => void;
  onAbrirEditarNota: (nota: Nota) => void;
  onToggleChecklist: (notaId: string, itemId: string) => void;
  salvarTituloColuna: (index: number, nome: string) => void;
  confirm: ReturnType<typeof useConfirm>;
  excluirNota: (id: string) => void;
  setNotaSelecionada: (v: NotaSelecionada | null) => void;
  setExibirExcluirNotaModal: (v: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `coluna-${id}` });

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `drop-coluna-${id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const combineRefs = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    setDropRef(el);
  };

  return (
    <div
      ref={combineRefs}
      style={style}
      className={`flex-shrink-0 w-72 flex flex-col rounded-2xl border-2 bg-white/80 shadow-sm overflow-hidden transition-all ${
        isDragging ? 'opacity-90 shadow-lg ring-2 ring-amber-200 border-amber-300' : 'border-zinc-200'
      } ${isOver ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-50/30' : ''}`}
    >
      <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              {...attributes}
              {...listeners}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
              aria-label="Arrastar coluna"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <h3 className="font-semibold text-zinc-800 truncate">{titulo}</h3>
            <span className="text-xs text-zinc-400 bg-zinc-200 rounded-full px-2 py-0.5">{totalNotas}</span>
          </div>
          <button
            type="button"
            onClick={onEditarTitulo}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 flex-shrink-0"
            aria-label="Editar coluna"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Progresso</span>
            <span>{percentual}%</span>
          </div>
          <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${percentual}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[140px]">
        <SortableContext items={notas.map((n) => n.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {notas.map((nota) => (
              <CardNota
                key={nota.id}
                nota={nota}
                onEditar={() => onAbrirEditarNota(nota)}
                onToggleChecklist={onToggleChecklist}
                onExcluir={() => {
                  setNotaSelecionada({
                    id: nota.id,
                    titulo: nota.titulo,
                    texto: nota.texto,
                    cor: nota.cor,
                    coluna: nota.coluna,
                    prioridade: nota.prioridade,
                  });
                  setExibirExcluirNotaModal(true);
                }}
              />
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>

      <div className="p-3 border-t border-zinc-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onNovaNota}
          className="flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          <Plus className="w-4 h-4" />
          Nova nota
        </button>
        <button
          type="button"
          onClick={onExcluirColuna}
          className="text-xs text-zinc-400 hover:text-rose-600 transition"
        >
          Excluir coluna
        </button>
      </div>
    </div>
  );
}

const CardNota = React.memo(function CardNota({
  nota,
  onEditar,
  onToggleChecklist,
  onExcluir,
}: {
  nota: Nota;
  onEditar: () => void;
  onToggleChecklist: (notaId: string, itemId: string) => void;
  onExcluir: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: nota.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const checklist = nota.checklist ?? [];
  const { concluidos, total } = progressoChecklist(checklist);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={false}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md ${isDragging ? 'opacity-0 pointer-events-none' : ''}`}
    >
      <div className="flex">
        <div className={`w-1 flex-shrink-0 ${nota.cor}`} />
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start gap-2">
            <button
              {...attributes}
              {...listeners}
              className="mt-0.5 p-1 rounded text-zinc-400 hover:bg-zinc-100 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
              aria-label="Arrastar"
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0" onClick={onEditar}>
              <p className="font-semibold text-zinc-800 truncate">{nota.titulo}</p>
              {nota.texto ? (
                <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{nota.texto}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-xs text-zinc-400">{formatarData(nota.data_criacao)}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    nota.prioridade === 'Alta'
                      ? 'bg-rose-100 text-rose-700'
                      : nota.prioridade === 'Média'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {nota.prioridade}
                </span>
                {total > 0 && (
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <ListTodo className="w-3.5 h-3.5" />
                    {concluidos}/{total}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditar();
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                aria-label="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onExcluir();
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-rose-100 hover:text-rose-600"
                aria-label="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          {checklist.length > 0 && (
            <div className="mt-2 pt-2 border-t border-zinc-100 space-y-1">
              {checklist.slice(0, 3).map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 text-sm cursor-pointer group"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => onToggleChecklist(nota.id, item.id)}
                    className="flex-shrink-0 text-emerald-600 hover:text-emerald-700"
                  >
                    {item.concluido ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-zinc-400" />}
                  </button>
                  <span className={item.concluido ? 'text-zinc-400 line-through' : 'text-zinc-600'}>{item.label}</span>
                </label>
              ))}
              {checklist.length > 3 && (
                <p className="text-xs text-zinc-400">+{checklist.length - 3} itens</p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

function EditarNotaModal({
  notaEditando,
  novaNota,
  setNovaNota,
  setShowModal,
  salvarOuAtualizarNota,
  onClose,
  setExibirExcluirNotaModal,
  setNotaSelecionada,
  colunas,
}: {
  notaEditando: NotaEditando | null;
  novaNota: { titulo: string; texto: string; cor: string; coluna: string; prioridade: string; checklist: ChecklistItem[] };
  setNovaNota: (v: typeof novaNota) => void;
  setShowModal: (v: boolean) => void;
  salvarOuAtualizarNota: () => void;
  onClose: () => void;
  setExibirExcluirNotaModal: (v: boolean) => void;
  setNotaSelecionada: (v: NotaSelecionada | null) => void;
  colunas: string[];
}) {
  const [novoItemChecklist, setNovoItemChecklist] = useState('');

  const adicionarChecklist = () => {
    if (!novoItemChecklist.trim()) return;
    setNovaNota({
      ...novaNota,
      checklist: [...(novaNota.checklist ?? []), { id: uuidv4(), label: novoItemChecklist.trim(), concluido: false }],
    });
    setNovoItemChecklist('');
  };

  const removerChecklist = (id: string) => {
    setNovaNota({ ...novaNota, checklist: (novaNota.checklist ?? []).filter((i) => i.id !== id) });
  };

  const toggleChecklist = (id: string) => {
    setNovaNota({
      ...novaNota,
      checklist: (novaNota.checklist ?? []).map((i) => (i.id === id ? { ...i, concluido: !i.concluido } : i)),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-zinc-200 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 overflow-y-auto flex-1">
          <h2 className="text-xl font-semibold text-zinc-800 mb-4">
            {notaEditando ? 'Editar nota' : 'Nova nota'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Título</label>
              <input
                type="text"
                placeholder="Título da nota"
                value={novaNota.titulo}
                onChange={(e) => setNovaNota({ ...novaNota, titulo: e.target.value })}
                className="w-full border border-zinc-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Descrição</label>
              <textarea
                placeholder="Descrição (opcional)"
                value={novaNota.texto}
                onChange={(e) => setNovaNota({ ...novaNota, texto: e.target.value })}
                rows={3}
                className="w-full border border-zinc-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Coluna</label>
              <select
                value={novaNota.coluna}
                onChange={(e) => setNovaNota({ ...novaNota, coluna: e.target.value })}
                className="w-full border border-zinc-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {colunas.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Prioridade</label>
              <div className="flex gap-2">
                {['Alta', 'Média', 'Baixa'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNovaNota({ ...novaNota, prioridade: p })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                      novaNota.prioridade === p
                        ? p === 'Alta'
                          ? 'bg-rose-100 text-rose-700 border-rose-200'
                          : p === 'Média'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Cor</label>
              <div className="flex gap-2">
                {CORES.map(({ cor, ring }) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setNovaNota({ ...novaNota, cor })}
                    className={`w-8 h-8 rounded-full ${cor} ${novaNota.cor === cor ? `ring-2 ${ring} ring-offset-2` : ''}`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Checklist</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Novo item..."
                  value={novoItemChecklist}
                  onChange={(e) => setNovoItemChecklist(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarChecklist())}
                  className="flex-1 border border-zinc-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={adicionarChecklist}
                  className="px-3 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <ul className="space-y-2">
                {(novaNota.checklist ?? []).map((item) => (
                  <li key={item.id} className="flex items-center gap-2 group">
                    <button
                      type="button"
                      onClick={() => toggleChecklist(item.id)}
                      className="flex-shrink-0 text-emerald-600 hover:text-emerald-700"
                    >
                      {item.concluido ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-zinc-400" />}
                    </button>
                    <span className={`flex-1 text-sm ${item.concluido ? 'text-zinc-400 line-through' : 'text-zinc-700'}`}>
                      {item.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => removerChecklist(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-400 hover:bg-rose-100 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-zinc-100 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvarOuAtualizarNota}
            className="px-4 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 font-medium text-sm"
          >
            {notaEditando ? 'Salvar' : 'Criar'}
          </button>
          {notaEditando && (
            <button
              type="button"
              onClick={() => {
                onClose();
                setNotaSelecionada({
                  id: notaEditando.id,
                  titulo: notaEditando.titulo,
                  texto: notaEditando.texto,
                  cor: notaEditando.cor,
                  coluna: notaEditando.coluna,
                  prioridade: notaEditando.prioridade,
                });
                setExibirExcluirNotaModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200 font-medium text-sm"
            >
              Excluir nota
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ExcluirNotaModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-zinc-200">
        <h2 className="text-lg font-semibold text-zinc-800 mb-2">Excluir nota</h2>
        <p className="text-zinc-600 text-sm mb-4">Tem certeza? Esta ação não pode ser desfeita.</p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-700 hover:bg-zinc-200 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 text-sm font-medium"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
