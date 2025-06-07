
'use client';
export const dynamic = 'force-dynamic';


import React, { useEffect, useState, useId } from 'react';
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
import { FiEye, FiEdit, FiPrinter, FiTrash2, FiBook } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function DashboardPage() {

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const usuarioLocal = localStorage.getItem('usuario');
      if (!usuarioLocal || usuarioLocal === 'null' || usuarioLocal === 'undefined') {
        window.location.href = '/login';
      } else {
        try {
          const usuario = JSON.parse(usuarioLocal);
          if (usuario.nivel !== 'admin') {
            window.location.href = '/dashboard/tecnico';
          } else {
            setEmpresaId(usuario.empresa_id);
          }
        } catch (error) {
          window.location.href = '/login';
        }
      }
    }
  }, []);
  const [notes, setNotes] = useState<any[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [notaParaExcluir, setNotaParaExcluir] = useState<any | null>(null);
  // Estado dinâmico das colunas
  const [colunas, setColunas] = useState<string[]>(['compras', 'avisos', 'lembretes']);
  // Buscar colunas salvas do banco ao carregar empresaId
  useEffect(() => {
    const fetchColunas = async () => {
      if (!empresaId) return;
      const { data, error } = await supabase
        .from('colunas_dashboard')
        .select('nome')
        .eq('empresa_id', empresaId)
        .order('posicao', { ascending: true });

      if (data) {
        setColunas(data.map((c) => c.nome));
      }
    };
    fetchColunas();
  }, [empresaId]);

  // Salvar colunas no banco
  const salvarColunasNoBanco = async (colunas: string[]) => {
    if (!empresaId) return;
    const colunasParaSalvar = colunas.map((nome, index) => ({
      nome,
      posicao: index,
      empresa_id: empresaId,
    }));
    // Limpa colunas antigas e insere as novas
    await supabase.from('colunas_dashboard').delete().eq('empresa_id', empresaId);
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
    if (!empresaId) return;
    // Busca o id da coluna pelo nome antigo e empresa_id
    const { data, error } = await supabase
      .from('colunas_dashboard')
      .select('id')
      .eq('empresa_id', empresaId)
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

  // Atualiza o nome da coluna em todas as notas relacionadas
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
  if (!empresaId) return;
  // Busca o id da coluna pelo nome antigo e empresa_id
  const { data, error } = await supabase
    .from('colunas_dashboard')
    .select('id')
    .eq('empresa_id', empresaId)
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
    texto: '',
    cor: 'bg-yellow-500',
    coluna: 'lembretes',
    prioridade: 'Média',
  });
  // Estado para nota em edição
  const [notaEditando, setNotaEditando] = useState<any | null>(null);

  // Função para criar ou atualizar nota
  const salvarOuAtualizarNota = async () => {
    if (!empresaId || !novaNota.titulo.trim()) return;

    if (notaEditando) {
      const { error } = await supabase
        .from('notas_dashboard')
        .update({
          titulo: novaNota.titulo,
          texto: novaNota.texto,
          cor: novaNota.cor,
          coluna: novaNota.coluna,
          prioridade: novaNota.prioridade
        })
        .eq('id', notaEditando.id);

      if (error) {
        console.error('Erro ao inserir nota:', error);
        toast.error('Erro ao atualizar nota.');
        return;
      }

      setNotes((prev) =>
        prev.map((n) => (n.id === notaEditando.id ? { ...n, ...novaNota } : n))
      );
      toast.success('Nota atualizada com sucesso!');
    } else {
      const nota = {
        id: uuidv4(),
        titulo: novaNota.titulo,
        texto: novaNota.texto,
        responsavel: '',
        cor: novaNota.cor,
        coluna: novaNota.coluna,
        prioridade: novaNota.prioridade,
        empresa_id: empresaId,
        pos_x: 0,
        pos_y: 0,
        data_criacao: new Date().toISOString()
      };

      const { error } = await supabase.from('notas_dashboard').insert([nota]);
      if (error) {
        console.error('Erro ao inserir nota:', error);
        toast.error('Erro ao salvar nota.');
        return;
      }

      setNotes((prev) => [nota, ...prev]);
      toast.success('Nota adicionada com sucesso!');
    }

    setShowModal(false);
    setNovaNota({ titulo: '', texto: '', cor: 'bg-yellow-500', coluna: 'lembretes', prioridade: 'Média' });
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

  return (
    <div className="w-full px-6 py-4">
      <h1 className="text-2xl font-bold mb-2">Dashboard Admin</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1860fa] text-white p-4 rounded-xl shadow">
          <p className="text-sm">OS em aberto</p>
          <p className="text-2xl font-bold">12</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-sm text-gray-500">OS concluídas</p>
          <p className="text-2xl font-bold">28</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-sm text-gray-500">Total do mês</p>
          <p className="text-2xl font-bold">R$ 4.890,00</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p className="text-sm text-gray-500">Técnicos ativos</p>
          <p className="text-2xl font-bold">5</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-300 rounded-xl shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiBook className="text-yellow-500" />
          Anotações Fixas
        </h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={colunas.map((coluna) => `coluna-${coluna}`)}
            strategy={horizontalListSortingStrategy}
          >
            <div className="flex gap-6 overflow-x-auto">
              {colunas.map((coluna, index) => (
                <SortableColunaCard
                  key={`coluna-${coluna}`}
                  id={`coluna-${coluna}`}
                  className="min-w-[250px] bg-white border border-yellow-400 rounded-md shadow-sm p-3 flex flex-col gap-3"
                >
                  {(params) => {
                    const { attributes, listeners, setColunasOrdenadas } = params;
                    return (
                      <>
                        <div
                          className="flex justify-between items-center cursor-move"
                          {...attributes}
                          {...listeners}
                        >
                          <span className="font-semibold text-lg w-full truncate">{colunas[index]}</span>
                        </div>

                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event: any) => {
                          const { active, over } = event;
                          if (!over || active.id === over.id) return;
                          const isColuna = (id: string) => String(id).startsWith('coluna-');
                          if (isColuna(active.id) && isColuna(over.id)) {
                            const activeIndex = colunas.findIndex((c) => `coluna-${c}` === active.id);
                            const overIndex = colunas.findIndex((c) => `coluna-${c}` === over.id);
                            if (activeIndex !== -1 && overIndex !== -1) {
                              // CHAMAR salvarColunasNoBanco após atualizar
                              const novas = arrayMove(colunas, activeIndex, overIndex);
                              setColunas(novas);
                              salvarColunasNoBanco(novas);
                            }
                            return;
                          }
                          // fallback para handleDragEnd original para notas
                          handleDragEnd(event);
                        }}>
                          <SortableContext
                            items={notes
                              .filter((n) => n.coluna === coluna)
                              .sort((a, b) => a.pos_x - b.pos_x)
                              .map((n) => n.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="flex flex-col gap-3 bg-yellow-50 rounded-md">
                              {notes
                                .filter((note) => note.coluna === coluna)
                                .sort((a, b) => a.pos_x - b.pos_x)
                                .map((note) => (
                                  <SortableNoteCard key={note.id} id={note.id}>
                                    <div className="bg-white rounded-lg shadow-md w-60 h-44 border border-gray-200 overflow-hidden flex flex-col">
                                      <div className={`px-3 py-2 ${note.cor} text-white font-bold text-sm flex items-center justify-between`}>
                                        <span>{note.titulo}</span>
                                        {note.prioridade && (
                                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                            note.prioridade === 'Alta' ? 'bg-red-100 text-red-600' :
                                            note.prioridade === 'Média' ? 'bg-yellow-100 text-yellow-600' :
                                            'bg-green-100 text-green-600'
                                          }`}>
                                            {note.prioridade}
                                          </span>
                                        )}
                                      </div>
                                      <div className="p-3 flex flex-col justify-between flex-1">
                                        <div className="text-xs text-gray-700 line-clamp-3">{note.texto}</div>
                                        <div className="flex justify-end mt-2 gap-2">
                                          <button
                                            type="button"
                                            onMouseDown={() => {
                                              setNovaNota({
                                                titulo: note.titulo,
                                                texto: note.texto,
                                                cor: note.cor,
                                                coluna: note.coluna,
                                                prioridade: note.prioridade || 'Média'
                                              });
                                              setNotaEditando(note);
                                              setShowModal(true);
                                            }}
                                            className="text-yellow-600 hover:text-yellow-800 transition-colors"
                                          >
                                            <FiEdit size={16} />
                                          </button>
                                          <button
                                            type="button"
                                            onMouseDown={() => {
                                              setNotaParaExcluir(note);
                                            }}
                                            className="text-red-600 hover:text-red-800 transition-colors"
                                          >
                                            <FiTrash2 size={16} />
                                          </button>
                                        </div>
                                        <div className="text-[10px] text-gray-400 text-right mt-2">
                                          {note.data_criacao
                                            ? format(new Date(note.data_criacao), 'dd/MM/yyyy')
                                            : (note.created_at ? format(new Date(note.created_at), 'dd/MM/yyyy') : '')}
                                        </div>
                                      </div>
                                    </div>
                                  </SortableNoteCard>
                                ))}
                            </div>
                          </SortableContext>
                        </DndContext>

                        <button
                          type="button"
                          onMouseDown={() => {
                            setNovaNota({ titulo: '', texto: '', cor: 'bg-yellow-500', coluna });
                            setNotaEditando(null);
                            setShowModal(true);
                          }}
                          className="bg-gray-50 border border-dashed rounded-lg p-3 text-center text-sm text-gray-500 hover:bg-gray-100 cursor-pointer"
                        >
                          + Nova anotação
                        </button>

                        <button
                          type="button"
                          onMouseDown={async () => {
                            const confirmacao = window.confirm(`Tem certeza que deseja excluir a coluna "${coluna}"?`);
                            if (confirmacao) {
                              const novas = colunas.filter((_, i) => i !== index);
                              setColunas(novas);
                              await supabase.from('colunas_dashboard').delete().eq('empresa_id', empresaId).eq('nome', coluna);
                              salvarColunasNoBanco(novas);
                              setNotes((prev) => prev.filter((n) => n.coluna !== coluna));
                            }
                          }}
                          className="mt-2 text-sm text-red-500 hover:text-red-700 flex items-center justify-center"
                          title="Excluir coluna"
                        >
                          <FiTrash2 size={16} className="mr-1" />
                          Excluir coluna
                        </button>
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
                  className="bg-white border border-dashed rounded-lg w-full h-full p-4 text-center text-sm text-gray-500 hover:bg-gray-100"
                >
                  + Nova coluna
                </button>
              </div>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">📱 Aparelhos por Técnico</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border hover:shadow">
            <h3 className="font-semibold text-gray-800">Carlos</h3>
            <p className="text-sm text-gray-600">3 aparelhos em andamento</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border hover:shadow">
            <h3 className="font-semibold text-gray-800">Fernanda</h3>
            <p className="text-sm text-gray-600">5 aparelhos em andamento</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border hover:shadow">
            <h3 className="font-semibold text-gray-800">Eduardo</h3>
            <p className="text-sm text-gray-600">2 aparelhos em andamento</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Últimas 5 Ordens de Serviço</h2>
          <button className="bg-[#1860fa] text-white px-4 py-2 rounded-lg text-sm">Nova OS</button>
        </div>

        <div className="grid grid-cols-11 items-center gap-4 text-sm font-semibold text-gray-500 px-4 mb-2">
          <div>Cliente</div>
          <div>Aparelho</div>
          <div>Serviço</div>
          <div>Status</div>
          <div>Entrada</div>
          <div>Entrega</div>
          <div>Peça</div>
          <div>Serviço</div>
          <div>Total</div>
          <div>Técnico</div>
          <div className="text-right">Ações</div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-11 items-center gap-4 bg-green-50 p-4 rounded-xl">
            <div>João Silva</div>
            <div>iPhone 11</div>
            <div>Troca de Tela</div>
            <div className="text-green-700">Concluída</div>
            <div>10/05/2025</div>
            <div>12/05/2025</div>
            <div>R$ 200,00</div>
            <div>R$ 150,00</div>
            <div>R$ 350,00</div>
            <div>Carlos</div>
            <div className="flex justify-end gap-2 text-xs">
              <button className="text-blue-600 hover:text-blue-800">
                <FiEye size={16} />
              </button>
              <button className="text-yellow-600 hover:text-yellow-800">
                <FiEdit size={16} />
              </button>
              <button className="text-gray-600 hover:text-gray-800">
                <FiPrinter size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-11 items-center gap-4 bg-yellow-50 p-4 rounded-xl">
            <div>Maria Souza</div>
            <div>Samsung A32</div>
            <div>Formatação</div>
            <div className="text-yellow-700">Aguardando aprovação</div>
            <div>13/05/2025</div>
            <div>15/05/2025</div>
            <div>R$ 0,00</div>
            <div>R$ 80,00</div>
            <div>R$ 80,00</div>
            <div>Fernanda</div>
            <div className="flex justify-end gap-2 text-xs">
              <button className="text-blue-600 hover:text-blue-800">
                <FiEye size={16} />
              </button>
              <button className="text-yellow-600 hover:text-yellow-800">
                <FiEdit size={16} />
              </button>
              <button className="text-gray-600 hover:text-gray-800">
                <FiPrinter size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-11 items-center gap-4 bg-blue-50 p-4 rounded-xl">
            <div>Lucas Souza</div>
            <div>Iphone 13 Pro Max</div>
            <div>Formatação</div>
            <div className="text-blue-700">Orçamento</div>
            <div>13/05/2025</div>
            <div>15/05/2025</div>
            <div>R$ 0,00</div>
            <div>R$ 0,00</div>
            <div>R$ 0,00</div>
            <div>Fernanda</div>
            <div className="flex justify-end gap-2 text-xs">
              <button className="text-blue-600 hover:text-blue-800">
                <FiEye size={16} />
              </button>
              <button className="text-yellow-600 hover:text-yellow-800">
                <FiEdit size={16} />
              </button>
              <button className="text-gray-600 hover:text-gray-800">
                <FiPrinter size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-base font-semibold mb-2">OS por Mês</h2>
          <Line options={options} data={data} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-base font-semibold mb-2">Entradas Financeiras</h2>
          <Line
            options={options}
            data={{
              ...data,
              datasets: [
                {
                  ...data.datasets[0],
                  label: 'R$',
                  data: [2000, 2500, 1800, 2200, 2600, 3000],
                },
              ],
            }}
          />
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-base font-semibold mb-2">Comissões Técnicas</h2>
          <Line
            options={options}
            data={{
              ...data,
              datasets: [
                {
                  ...data.datasets[0],
                  label: '% Comissão',
                  data: [400, 480, 500, 600, 720, 800],
                },
              ],
            }}
          />
        </div>
      </div>
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
              placeholder="Texto"
              value={novaNota.texto}
              onChange={(e) => setNovaNota({ ...novaNota, texto: e.target.value })}
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
                  className="px-4 py-2 text-sm rounded bg-black text-white hover:bg-red-700"
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
  );
}