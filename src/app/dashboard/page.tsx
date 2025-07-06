
'use client';
export const dynamic = 'force-dynamic';


import React, { useEffect, useState, useId } from 'react';
import { useRouter } from "next/navigation";
import clsx from "clsx";
import MenuLayout from '@/components/MenuLayout';
import { format } from 'date-fns';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Book, Pencil, AlertTriangle, Circle, CheckCircle } from 'lucide-react';
  // Função para formatar data (pode ser ajustada conforme necessidade)
  function formatarData(data: string) {
    try {
      return format(new Date(data), 'dd/MM/yyyy');
    } catch {
      return '';
    }
  }
import { useSupabase } from '@/context/AuthContext';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from '@/context/AuthContext';
import ClientOnly from '@/components/ClientOnly';
import { v4 as uuidv4 } from 'uuid';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function DashboardPage() {
  // Use o contexto de autenticação
  const { session, user, usuarioData, empresaData } = useAuth();
  const supabase = useSupabaseClient();
  const router = useRouter();
  // Função para marcar nota como concluída
  const marcarComoConcluido = async (id: string, valor: boolean) => {
    console.log("Atualizando:", { id, valor });

    const { error } = await supabase
      .from('notas_dashboard')
      .update({ concluido: valor })
      .eq('id', id);

    if (error) {
      console.error('Erro ao marcar como concluído:', error.message);
    } else {
      router.refresh();
    }
  };
  // Estado para notas e colunas
  const [notes, setNotes] = useState<any[]>([]);
  const [notaParaExcluir, setNotaParaExcluir] = useState<any | null>(null);
  // Estado dinâmico das colunas
  const [colunas, setColunas] = useState<string[]>(['compras', 'avisos', 'lembretes']);
  const [carregando, setCarregando] = useState(true);

  // empresa_id vem de empresaData
  const empresa_id = empresaData?.id;
  // Carregando depende de usuarioData
  useEffect(() => {
    if (usuarioData !== undefined) setCarregando(false);
  }, [usuarioData]);

  // Buscar colunas salvas do banco ao carregar empresa_id
  useEffect(() => {
    const fetchColunas = async () => {
      if (!empresa_id) return;
      // Busca colunas_dashboard do supabase
      const { data, error } = await supabase
        .from('colunas_dashboard')
        .select('nome')
        .eq('empresa_id', empresa_id)
        .order('posicao', { ascending: true });
      if (!error && data && data.length > 0) {
        setColunas(data.map((c) => c.nome));
      }
    };
    fetchColunas();
  }, [empresa_id, supabase]);

  // Buscar notas do banco assim que empresa_id estiver disponível
  useEffect(() => {
    const fetchNotas = async () => {
      if (!empresa_id) return;
      const { data, error } = await supabase
        .from("notas_dashboard")
        .select("*")
        .eq("empresa_id", empresa_id);
      if (!error && data) {
        setNotes(data);
      }
    };
    fetchNotas();
  }, [empresa_id, supabase]);

  // Salvar colunas no banco
  const salvarColunasNoBanco = async (colunas: string[]) => {
    if (!empresa_id) return;
    const colunasParaSalvar = colunas.map((nome, index) => ({
      nome,
      posicao: index,
      empresa_id: empresa_id,
    }));
    // Limpa colunas antigas e insere as novas
    await supabase.from('colunas_dashboard').delete().eq('empresa_id', empresa_id);
    await supabase.from('colunas_dashboard').insert(colunasParaSalvar);
  };

  // Função para atualizar o título da coluna localmente (chamada no onChange do input)
  const handleColunaTituloChange = (index: number, novoNome: string) => {
    setColunas((prev) => {
      const novas = [...prev];
      novas[index] = novoNome;
      return novas;
    });
  };

  // Função para salvar o título da coluna no banco (chamada no onBlur do input)
  const salvarTituloColuna = async (index: number) => {
    // Buscar o nome antigo e o id da coluna no banco
    const nomeAntigo = colunas[index];
    if (!empresa_id) return;
    // Busca o id da coluna pelo nome antigo e empresa_id
    const { data, error } = await supabase
      .from('colunas_dashboard')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('posicao', index)
      .maybeSingle();
    if (data && data.id) {
      await editarColuna(data.id, colunas[index], nomeAntigo);
      // Salva colunas no banco após alteração
      salvarColunasNoBanco(colunas);
    } else {
      toast.error('Coluna não encontrada para renomear');
    }
  };

// Função dedicada para atualizar o nome da coluna e salvar no banco, atualizando também as notas
  const editarColuna = async (colunaId: string, novoNome: string, nomeAntigo: string) => {
    // Atualiza o nome da coluna
    const { error: colunaError } = await supabase
      .from('colunas_dashboard')
      .update({ nome: novoNome })
      .eq('id', colunaId);

    if (colunaError) {
      toast.error('Erro ao renomear a coluna');
      return;
    }

    // Atualiza o nome da coluna em todas as notas_dashboard relacionadas
    const { error: notasError } = await supabase
      .from('notas_dashboard')
      .update({ coluna: novoNome })
      .eq('coluna', nomeAntigo);

    if (notasError) {
      toast.error('Erro ao atualizar as notas');
      return;
    }

    toast.success('Coluna e notas atualizadas com sucesso!');
    // Atualiza localmente
    setColunas((prev) => {
      const atualizado = [...prev];
      const idx = atualizado.findIndex((c) => c === nomeAntigo);
      if (idx !== -1) {
        atualizado[idx] = novoNome;
      }
      return atualizado;
    });
    setNotes((prev) =>
      prev.map((n) => n.coluna === nomeAntigo ? { ...n, coluna: novoNome } : n)
    );
  };

// Função antiga para compatibilidade e uso no EditableColunaNome
  const atualizarNomeColuna = async (index: number, novoNome: string) => {
    // Buscar o nome antigo e o id da coluna no banco
    const nomeAntigo = colunas[index];
    if (!empresa_id) return;
    // Busca o id da coluna pelo nome antigo e empresa_id
    const { data, error } = await supabase
      .from('colunas_dashboard')
      .select('id')
      .eq('empresa_id', empresa_id)
      .eq('nome', nomeAntigo)
      .maybeSingle();
    if (data && data.id) {
      await editarColuna(data.id, novoNome, nomeAntigo);
      // Salva colunas no banco após alteração
      const novasColunas = [...colunas];
      novasColunas[index] = novoNome;
      salvarColunasNoBanco(novasColunas);
    } else {
      toast.error('Coluna não encontrada para renomear');
    }
  };

  // Modal de nova nota/edição de nota
  const [showModal, setShowModal] = useState(false);
  const [novaNota, setNovaNota] = useState({
    titulo: '',
    descricao: '',
    cor: 'bg-yellow-500',
    coluna: 'lembretes',
    prioridade: 'Média',
  });
  // Estado para nota em edição
  const [notaEditando, setNotaEditando] = useState<any | null>(null);

  // Função para criar ou atualizar nota
  const salvarOuAtualizarNota = async () => {
    // Adiciona empresaId do contexto de autenticação
    const empresaId = empresaData?.id;
    if (!empresaId || !novaNota.titulo.trim()) return;

    const idNota = notaEditando?.id;

    if (notaEditando) {
      // Atualização: use nomes corretos de colunas
      const { error } = await supabase
        .from('notas_dashboard')
        .update({
          titulo: novaNota.titulo,
          descricao: novaNota.descricao,
          prioridade: novaNota.prioridade,
          cor: novaNota.cor,
          concluido: notaEditando.concluido ?? false,
          data: notaEditando.data ?? notaEditando.data_criacao,
        })
        .eq('id', idNota);

      if (error) {
        console.error('Erro ao atualizar nota:', error);
        toast.error('Erro ao atualizar nota.');
        return;
      }

      setNotes((prev) =>
        prev.map((n) =>
          n.id === idNota
            ? {
                ...n,
                titulo: novaNota.titulo,
                texto: novaNota.descricao,
                cor: novaNota.cor,
                prioridade: novaNota.prioridade,
                coluna: novaNota.coluna,
                concluido: notaEditando.concluido ?? false,
                data: notaEditando.data ?? notaEditando.data_criacao,
              }
            : n
        )
      );
      toast.success('Nota atualizada com sucesso!');
    } else {
      // Inserção com nomes exatos das colunas conforme schema
      const { error } = await supabase.from('notas_dashboard').insert([{
        id: uuidv4(),
        titulo: novaNota.titulo,
        texto: novaNota.descricao,
        cor: novaNota.cor,
        prioridade: novaNota.prioridade,
        coluna: novaNota.coluna,
        empresa_id: empresaId,
        responsavel: session?.user?.email ?? '',
        data_criacao: new Date().toISOString(),
        pos_x: 0,
        pos_y: 0
      }]);

      if (error) {
        console.error("Erro detalhado do Supabase:", error);
        toast.error('Erro ao salvar nota.');
        return;
      }

      // Adiciona a nota localmente para atualização imediata na UI
      setNotes((prev) => [
        {
          id: '', // será atualizado no fetch, mas adiciona um placeholder
          titulo: novaNota.titulo,
          texto: novaNota.descricao,
          cor: novaNota.cor,
          prioridade: novaNota.prioridade,
          coluna: novaNota.coluna,
          empresa_id: empresaId,
          responsavel: session?.user?.email ?? '',
          data_criacao: new Date().toISOString(),
          pos_x: 0,
          pos_y: 0
        },
        ...prev,
      ]);
      toast.success('Nota adicionada com sucesso!');
    }

    setShowModal(false);
    setNovaNota({ titulo: '', descricao: '', cor: 'bg-yellow-500', coluna: 'lembretes', prioridade: 'Média' });
    setNotaEditando(null);
  };


  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'OS Criadas',
        data: [12, 15, 18, 16, 20, 24],
        borderColor: '#1860fa',
        backgroundColor: 'rgba(24, 96, 250, 0.2)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
  };

  // Notas fixas para drag and drop

  const sensors = useSensors(useSensor(PointerSensor));

  // Função para lidar com o fim do drag and drop (localizada)
  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const isColuna = (id: string) => String(id).startsWith('coluna-');

    // Mover coluna
    if (isColuna(active.id) && isColuna(over.id)) {
      const activeIndex = colunas.findIndex((c) => `coluna-${c}` === active.id);
      const overIndex = colunas.findIndex((c) => `coluna-${c}` === over.id);
      if (activeIndex !== -1 && overIndex !== -1) {
        const novasColunas = arrayMove(colunas, activeIndex, overIndex);
        setColunas(novasColunas);
        salvarColunasNoBanco(novasColunas);
      }
      return;
    }

    // Novo bloco: tratar movimentação entre colunas explicitamente
    if (!isColuna(active.id) && !isColuna(over.id)) {
      const notaMovida = notes.find((n) => n.id === active.id);
      const notaAlvo = notes.find((n) => n.id === over.id);

      if (!notaMovida || !notaAlvo) return;

      const novaColuna = notaAlvo.coluna;

      // Atualiza a coluna da nota movida (caso tenha mudado)
      let novaNotaMovida = { ...notaMovida, coluna: novaColuna };

      // Atualiza lista temporária com a nota movida atualizada
      let notasTemp = notes.map((n) => (n.id === notaMovida.id ? novaNotaMovida : n));

      // Filtra as notas da nova coluna
      let notasNaColuna = notasTemp
        .filter((n) => n.coluna === novaColuna)
        .sort((a, b) => a.pos_x - b.pos_x);

      // Garante que a nota movida está na lista
      if (!notasNaColuna.find((n) => n.id === active.id)) {
        notasNaColuna.push(novaNotaMovida);
      }

      const activeIndex = notasNaColuna.findIndex((n) => n.id === active.id);
      const overIndex = notasNaColuna.findIndex((n) => n.id === over.id);
      if (activeIndex === -1 || overIndex === -1) return;

      const notasReordenadas = arrayMove(notasNaColuna, activeIndex, overIndex).map(
        (nota, index) => ({ ...nota, pos_x: index })
      );

      // Atualiza estado antes de salvar no banco para evitar delay visual
      setNotes((prev) => {
        const idsAtualizados = new Set(notasReordenadas.map((n) => n.id));
        const restantes = prev.filter((n) => !idsAtualizados.has(n.id));
        return [...restantes, ...notasReordenadas].sort((a, b) => a.pos_x - b.pos_x);
      });

      // Atualiza no banco
      for (const nota of notasReordenadas) {
        await supabase
          .from('notas_dashboard')
          .update({ pos_x: nota.pos_x, coluna: nota.coluna })
          .eq('id', nota.id);
      }

      return;
    }
  };
  const excluirNota = async (id: string) => {
    console.log('Excluindo nota com ID:', id); // linha adicionada para debug
    await supabase.from('notas_dashboard').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success('Nota excluída com sucesso!');
  };

  const handleExcluirNota = async (id: string) => {
    const confirmacao = confirm('Tem certeza que deseja excluir esta anotação?');
    if (confirmacao) {
      await excluirNota(id);
    }
  };

  function SortableNoteCard({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const describedById = useId();
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    return (
      <div ref={setNodeRef} style={style}>
        <div {...attributes} {...listeners} aria-describedby={describedById} id={describedById}>
          {children}
        </div>
      </div>
    );
  }

  // Componente para colunas sortables
  function SortableColunaCard({
    id,
    children,
    className = '',
  }: {
    id: string;
    children: React.ReactNode;
    className?: string;
  }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const describedById = useId();
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    // Refatoração da função de reordenação das colunas
    const setColunasOrdenadas = (activeIndex: number, overIndex: number) => {
      const novas = arrayMove(colunas, activeIndex, overIndex);
      setColunas(novas);
      salvarColunasNoBanco(novas);
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={className}
        aria-describedby={describedById}
        id={describedById}
      >
        {/* children pode acessar setColunasOrdenadas se necessário */}
        {typeof children === "function"
          ? children({ attributes, listeners, setColunasOrdenadas })
          : children}
      </div>
    );
  }

  // Checagem de carregamento e autenticação
  if (carregando || !session?.user) {
    return <div className="p-4">Carregando...</div>;
  }

  // Definir usuarioNome de forma robusta
  let usuarioNome: string = 'usuário';
  try {
    // Prioriza usuarioData.nome (não userData)
    if (usuarioData?.nome) usuarioNome = usuarioData.nome;
    else {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        usuarioNome = parsed.nome || parsed.user_metadata?.nome || 'usuário';
      } else {
        usuarioNome = session?.user?.user_metadata?.nome || 'usuário';
      }
    }
  } catch {
    usuarioNome = session?.user?.user_metadata?.nome || 'usuário';
  }

  return (
    <MenuLayout>
      <div className="p-6 rounded-lg border bg-white">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Book className="text-yellow-500 w-5 h-5" />
          Anotações Fixas
        </h2>
        <ClientOnly>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={colunas.map((coluna) => `coluna-${coluna}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 px-4 py-6">
                {colunas.map((coluna, index) => (
                  <SortableColunaCard
                    key={`coluna-${coluna}`}
                    id={`coluna-${coluna}`}
                    className="bg-white border border-zinc-200 rounded-xl shadow-md flex flex-col transition-all"
                  >
                    {(params) => {
                      const { attributes, listeners, setColunasOrdenadas } = params;
                      return (
                        <>
                          <div
                            className="px-4 py-3 border-b border-zinc-100 font-semibold text-zinc-800 flex justify-between items-center cursor-move"
                            {...attributes}
                            {...listeners}
                          >
                            <span>{colunas[index]}</span>
                          </div>

                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event: any) => {
                            const { active, over } = event;
                            if (!over || active.id === over.id) return;
                            const isColuna = (id: string) => String(id).startsWith('coluna-');
                            if (isColuna(active.id) && isColuna(over.id)) {
                              const activeIndex = colunas.findIndex((c) => `coluna-${c}` === active.id);
                              const overIndex = colunas.findIndex((c) => `coluna-${c}` === over.id);
                              if (activeIndex !== -1 && overIndex !== -1) {
                                const novas = arrayMove(colunas, activeIndex, overIndex);
                                setColunas(novas);
                                salvarColunasNoBanco(novas);
                              }
                              return;
                            }
                            handleDragEnd(event);
                          }}>
                            <SortableContext
                              items={notes
                                .filter((n) => n.coluna === coluna)
                                .sort((a, b) => a.pos_x - b.pos_x)
                                .map((n) => n.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                                {notes
                                  .filter((nota) => nota.coluna === coluna)
                                  .sort((a, b) => a.pos_x - b.pos_x)
                                  .map((nota) => (
                                    <SortableNoteCard key={nota.id} id={nota.id}>
                                      <div className="flex rounded-lg shadow-md hover:shadow-lg bg-white transition-shadow duration-200 overflow-hidden cursor-pointer">
                                        <div className={`w-1 ${nota.cor}`} />
                                        <div className="flex-1 p-4">
                                          <div className="flex items-start justify-between">
                                            <p className="text-base font-semibold">{nota.titulo}</p>
                                            <button
                                              className="text-gray-400 hover:text-primary transition-colors duration-150"
                                              type="button"
                                              onMouseDown={() => {
                                                setNovaNota({
                                                  titulo: nota.titulo,
                                                  descricao: nota.texto, // Aqui texto vira descricao
                                                  cor: nota.cor,
                                                  coluna: nota.coluna,
                                                  prioridade: nota.prioridade || 'Média',
                                                });
                                                setNotaEditando(nota);
                                                setShowModal(true);
                                              }}
                                            >
                                              <Pencil size={16} />
                                            </button>
                                          </div>
                                          <p className="text-sm text-gray-600 mt-1 line-clamp-3">{nota.texto}</p>
                                          {/* Checkbox de concluído */}
                                          <div className="flex items-center gap-2 mt-3">
                                            <input
                                              type="checkbox"
                                              checked={!!nota.concluido}
                                              onChange={async (e) => {
                                                const novoValor = e.target.checked;
                                                await supabase
                                                  .from('notas_dashboard')
                                                  .update({ concluido: novoValor })
                                                  .eq('id', nota.id);
                                                router.refresh();
                                              }}
                                              className="h-4 w-4 text-primary border-gray-300 rounded"
                                            />
                                            <span className={clsx("text-sm", { "line-through text-gray-400": nota.concluido })}>
                                              {nota.concluido ? "Concluído" : "Marcar como concluído"}
                                            </span>
                                          </div>
                                          {/* Data e prioridade */}
                                          <div className="flex justify-between items-end mt-4">
                                            <span className="text-xs text-gray-500">
                                              {formatarData(nota.data_criacao)}
                                            </span>
                                            {nota.prioridade === "Alta" && (
                                              <span className="text-red-500 text-xs font-medium flex items-center gap-1">
                                                <AlertTriangle size={12} /> Alta
                                              </span>
                                            )}
                                            {nota.prioridade === "Média" && (
                                              <span className="text-yellow-500 text-xs font-medium flex items-center gap-1">
                                                <Circle size={12} /> Média
                                              </span>
                                            )}
                                            {nota.prioridade === "Baixa" && (
                                              <span className="text-green-500 text-xs font-medium flex items-center gap-1">
                                                <CheckCircle size={12} /> Baixa
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </SortableNoteCard>
                                  ))}
                              </div>
                            </SortableContext>
                          </DndContext>

                          <div className="border-t border-zinc-100 px-4 py-2 flex justify-between items-center">
                            <button
                              type="button"
                              className="text-xs text-zinc-600 hover:text-zinc-900 transition"
                              onMouseDown={() => {
                                setNovaNota({ titulo: '', texto: '', cor: 'bg-yellow-500', coluna });
                                setNotaEditando(null);
                                setShowModal(true);
                              }}
                            >
                              + Nova anotação
                            </button>
                            <button
                              type="button"
                              className="text-xs text-rose-500 hover:text-rose-700 transition"
                              title="Excluir coluna"
                              onMouseDown={async () => {
                                const empresaId = session?.user?.user_metadata?.empresa_id;
                                const confirmacao = window.confirm(`Tem certeza que deseja excluir a coluna "${coluna}"?`);
                                if (confirmacao) {
                                  const novas = colunas.filter((_, i) => i !== index);
                                  setColunas(novas);
                                  await supabase.from('colunas_dashboard').delete().eq('empresa_id', empresaId).eq('nome', coluna);
                                  salvarColunasNoBanco(novas);
                                  setNotes((prev) => prev.filter((n) => n.coluna !== coluna));
                                }
                              }}
                            >
                              Excluir coluna
                            </button>
                          </div>
                        </>
                      );
                    }}
                  </SortableColunaCard>
                ))}
                <div className="min-w-[250px]">
                  <button
                    onClick={() => {
                      const nova = prompt('Nome da nova coluna');
                      if (nova && !colunas.includes(nova)) {
                        const novas = [...colunas, nova.toLowerCase()];
                        setColunas(novas);
                        salvarColunasNoBanco(novas);
                      }
                    }}
                    className="bg-[#f9ffe0] border border-dashed border-[#cffb6d] text-black hover:bg-[#cffb6d] w-full h-full p-4 text-center text-sm rounded-lg"
                  >
                    + Nova coluna
                  </button>
                </div>
              </div>
            </SortableContext>
          </DndContext>
        </ClientOnly>
        {/* Modal Nova Anotação / Editar Anotação */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
              <h2 className="text-lg font-semibold">
                {notaEditando ? 'Editar Anotação' : 'Nova Anotação'}
              </h2>
              <input
                type="text"
                placeholder="Título"
                value={novaNota.titulo}
                onChange={(e) => setNovaNota({ ...novaNota, titulo: e.target.value })}
                className="w-full border rounded p-2 text-sm"
              />
              <textarea
                placeholder="Descrição"
                value={novaNota.descricao}
                onChange={(e) => setNovaNota({ ...novaNota, descricao: e.target.value })}
                className="w-full border rounded p-2 text-sm"
              />
              <div className="flex gap-2">
                {[
                  { cor: 'bg-yellow-500' },
                  { cor: 'bg-green-500' },
                  { cor: 'bg-blue-500' },
                  { cor: 'bg-purple-500' },
                  { cor: 'bg-orange-500' }
                ].map((opcao) => (
                  <div
                    key={opcao.cor}
                    onClick={() => setNovaNota({ ...novaNota, cor: opcao.cor })}
                    className={`w-6 h-6 rounded-full ${opcao.cor} ${novaNota.cor === opcao.cor ? 'ring-2 ring-black' : ''} cursor-pointer`}
                  />
                ))}
              </div>
              {/* Seleção de prioridade */}
              <div className="flex gap-2 text-xs items-center">
                <span className="font-semibold">Prioridade:</span>
                {['Alta', 'Média', 'Baixa'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNovaNota({ ...novaNota, prioridade: p })}
                    className={`px-2 py-1 rounded-full border text-xs font-semibold
                      ${novaNota.prioridade === p
                        ? (
                          p === 'Alta'
                            ? 'bg-red-100 text-red-600 border-red-200'
                            : p === 'Média'
                              ? 'bg-yellow-100 text-yellow-600 border-yellow-200'
                              : 'bg-green-100 text-green-600 border-green-200'
                          )
                        : 'bg-gray-100 text-gray-500 border-gray-200'
                      }
                    `}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setNotaEditando(null);
                  }}
                  className="px-4 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarOuAtualizarNota}
                  className="px-4 py-2 text-sm rounded bg-[#1860fa] text-white hover:bg-blue-700"
                >
                  {notaEditando ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal de confirmação de exclusão */}
        {notaParaExcluir && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl space-y-4">
              <h2 className="text-xl font-bold">Confirmar Exclusão</h2>
              <p className="text-gray-600">
                Tem certeza que deseja excluir a anotação <strong>{notaParaExcluir.titulo}</strong>?
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  excluirNota(notaParaExcluir.id).then(() => {
                    setNotaParaExcluir(null);
                  });
                }}
              >
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setNotaParaExcluir(null)}
                    className="px-4 py-2 text-sm rounded bg-gray-200 hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm rounded bg-[#cffb6d] text-black hover:bg-lime-400"
                  >
                    Excluir
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ToastContainer para notificações */}
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </MenuLayout>
  );
}