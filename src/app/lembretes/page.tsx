

'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useId } from 'react';
import MenuLayout from '@/components/MenuLayout';
import { format } from 'date-fns';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import { Book, Pencil, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useAuth } from '@/context/AuthContext';
import ClientOnly from '@/components/ClientOnly';
import { v4 as uuidv4 } from 'uuid';
import ProtectedArea from '@/components/ProtectedArea';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/ConfirmDialog';

// Função para formatar data (pode ser ajustada conforme necessidade)
function formatarData(data: string) {
  try {
    return format(new Date(data), 'dd/MM/yyyy');
  } catch {
    return '';
  }
}

// Tipo para nota
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
}

// Tipo para nota em edição
interface NotaEditando {
  id: string;
  titulo: string;
  texto: string;
  cor: string;
  coluna: string;
  prioridade: string;
  data: string;
  data_criacao: string;
}

// Tipo para nota selecionada
interface NotaSelecionada {
  id: string;
  titulo: string;
  texto: string;
  cor: string;
  coluna: string;
  prioridade: string;
}

export default function LembretesPage() {
  // Use o contexto de autenticação
  const { session, user, usuarioData, empresaData } = useAuth();
  const empresa_id = empresaData?.id;
  const supabase = useSupabaseClient();
  const { addToast } = useToast();
  const confirm = useConfirm();

  // Função para buscar colunas do banco
  const fetchColunas = async () => {
    if (!empresa_id) return;
    const { data, error } = await supabase
      .from('colunas_dashboard')
      .select('nome')
      .eq('empresa_id', empresa_id)
      .order('posicao', { ascending: true });
    if (!error && data && data.length > 0) {
      setColunas(data.map((c) => c.nome));
    }
  };

  // Função para criar uma nova coluna (agora dentro do componente, com acesso ao user)
  const criarColuna = async (titulo: string) => {
    // Usar empresa_id do contexto de autenticação
    if (!empresa_id) {
      addToast('error', "Erro: empresa não identificada.");
      return;
    }
    if (!titulo) return;
    
    const colunaData = {
      nome: titulo,
      empresa_id: empresa_id,
      posicao: colunas.length, // Adiciona a nova coluna no final
    };
    
    console.log('Tentando criar coluna com dados:', colunaData);
    console.log('Empresa ID:', empresa_id);
    console.log('User ID:', user?.id);
    
    try {
      const { data, error } = await supabase
        .from("colunas_dashboard")
        .insert([colunaData])
        .select();

      if (error) {
        console.error('Erro ao criar coluna:', error);
        console.error('Tipo do erro:', typeof error);
        console.error('String do erro:', JSON.stringify(error, null, 2));
        console.error('Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        addToast('error', `Erro ao criar coluna: ${error.message || 'Erro desconhecido'}`);
      } else {
        console.log('Coluna criada com sucesso:', data);
        addToast('success', "Coluna criada com sucesso!");
        await fetchColunas();
      }
    } catch (err) {
      console.error("Erro inesperado ao criar coluna:", err);
      console.error("Tipo do erro:", typeof err);
      console.error("String do erro:", JSON.stringify(err, null, 2));
      addToast('error', `Erro inesperado ao criar coluna: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  // Função para remover uma coluna
  const removerColuna = async (coluna: string) => {
    if (!empresa_id || !coluna) return;
    const { error } = await supabase
      .from('colunas_dashboard')
      .delete()
      .eq('empresa_id', empresa_id)
      .eq('nome', coluna);
    if (!error) {
      addToast('success', "Coluna excluída com sucesso!");
    } else {
      addToast('error', "Erro ao excluir coluna.");
    }
  };

  // Estado para notas e colunas
  const [notes, setNotes] = useState<Nota[]>([]);
  // Estado dinâmico das colunas
  const [colunas, setColunas] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  // Estado para modal de edição de coluna
  const [modalColunaAberta, setModalColunaAberta] = useState<null | { index: number, valor: string }>(null);

  // Carregando depende de usuarioData
  useEffect(() => {
    if (usuarioData !== undefined) setCarregando(false);
  }, [usuarioData]);

  // Buscar colunas salvas do banco ao carregar empresa_id
  useEffect(() => {
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
    
    console.log('Salvando colunas no banco:', colunas);
    
    try {
      // Primeiro, busca as colunas existentes
      const { data: colunasExistentes, error: erroBusca } = await supabase
        .from('colunas_dashboard')
        .select('id, nome')
        .eq('empresa_id', empresa_id);
        
      if (erroBusca) {
        console.error('Erro ao buscar colunas existentes:', erroBusca);
        addToast('error', 'Erro ao atualizar ordem das colunas');
        return;
      }
      
      // Atualiza a posição de cada coluna
      for (let i = 0; i < colunas.length; i++) {
        const nomeColuna = colunas[i];
        const colunaExistente = colunasExistentes?.find(c => c.nome === nomeColuna);
        
        if (colunaExistente) {
          const { error: erroUpdate } = await supabase
            .from('colunas_dashboard')
            .update({ posicao: i })
            .eq('id', colunaExistente.id);
            
          if (erroUpdate) {
            console.error('Erro ao atualizar posição da coluna:', erroUpdate);
            addToast('error', 'Erro ao atualizar ordem das colunas');
            return;
          }
        }
      }
      
      console.log('Ordem das colunas atualizada com sucesso');
    } catch (err) {
      console.error('Erro inesperado ao salvar colunas:', err);
      addToast('error', 'Erro ao atualizar ordem das colunas');
    }
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
  const salvarTituloColuna = async (index: number, novoNome: string) => {
    if (!empresa_id) return;
    
    const nomeAtual = colunas[index];
    
    console.log('Salvando título da coluna:', { index, nomeAtual, novoNome, empresa_id });
    
    // Busca o id da coluna pelo nome atual e empresa_id
    const { data, error } = await supabase
      .from('colunas_dashboard')
      .select('id, nome')
      .eq('empresa_id', empresa_id)
      .eq('nome', nomeAtual)
      .maybeSingle();
      
    console.log('Resultado da busca:', { data, error });
      
    if (data && data.id) {
      const nomeAntigo = data.nome;
      console.log('Coluna encontrada:', { id: data.id, nomeAntigo, novoNome });
      await editarColuna(data.id, novoNome, nomeAntigo);
    } else {
      console.error('Coluna não encontrada para renomear:', { nomeAtual, empresa_id, data, error });
      
      // Vamos tentar buscar todas as colunas para debug
      const { data: todasColunas, error: erroTodas } = await supabase
        .from('colunas_dashboard')
        .select('id, nome, empresa_id')
        .eq('empresa_id', empresa_id);
        
      console.log('Todas as colunas da empresa:', { todasColunas, erroTodas });
      
      addToast('error', 'Coluna não encontrada para renomear');
    }
  };

  // Função dedicada para atualizar o nome da coluna e salvar no banco, atualizando também as notas
  const editarColuna = async (colunaId: string, novoNome: string, nomeAntigo: string) => {
    console.log('Editando coluna:', { colunaId, novoNome, nomeAntigo });
    
    // Atualiza o nome da coluna
    const { error: colunaError } = await supabase
      .from('colunas_dashboard')
      .update({ nome: novoNome })
      .eq('id', colunaId);

    if (colunaError) {
      console.error('Erro ao renomear a coluna:', colunaError);
      addToast('error', `Erro ao renomear a coluna: ${colunaError.message}`);
      return;
    }

    console.log('Nome da coluna atualizado com sucesso');

    // Atualiza o nome da coluna em todas as notas_dashboard relacionadas
    const { error: notasError } = await supabase
      .from('notas_dashboard')
      .update({ coluna: novoNome })
      .eq('coluna', nomeAntigo);

    if (notasError) {
      console.error('Erro ao atualizar as notas:', notasError);
      addToast('error', `Erro ao atualizar as notas: ${notasError.message}`);
      return;
    }

    console.log('Notas atualizadas com sucesso');
    addToast('success', 'Coluna e notas atualizadas com sucesso!');
    
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
  const [notaEditando, setNotaEditando] = useState<NotaEditando | null>(null);

  // Estados para modal de edição e nota selecionada
  const [notaSelecionada, setNotaSelecionada] = useState<NotaSelecionada | null>(null);

  // Função para criar ou atualizar nota
  const salvarOuAtualizarNota = async () => {
    // Adiciona empresaId do contexto de autenticação
    const empresaId = empresaData?.id;
    if (!empresaId || !novaNota.titulo.trim()) return;

    const nota = notaEditando;

    if (!nota || !nota.id) {
      // Criar nova nota
      const novaNotaObj = {
        id: uuidv4(),
        titulo: novaNota.titulo,
        texto: novaNota.texto,
        cor: novaNota.cor,
        coluna: novaNota.coluna,
        prioridade: novaNota.prioridade,
        empresa_id: empresaId,
        responsavel: session?.user?.email ?? '',
        data_criacao: new Date().toISOString(),
        pos_x: 0,
        pos_y: 0,
      };
      
      console.log('Tentando criar nota com dados:', novaNotaObj);
      console.log('Empresa ID:', empresaId);
      console.log('Session user:', session?.user);
      
      try {
        const { data, error: erroNota } = await supabase
          .from('notas_dashboard')
          .insert([novaNotaObj])
          .select();
          
        if (erroNota) {
          console.error('Erro ao salvar nota:', erroNota);
          console.error('Tipo do erro:', typeof erroNota);
          console.error('String do erro:', JSON.stringify(erroNota, null, 2));
          console.error('Detalhes do erro:', {
            message: erroNota.message,
            details: erroNota.details,
            hint: erroNota.hint,
            code: erroNota.code
          });
          addToast('error', `Erro ao salvar nota: ${erroNota.message || 'Erro desconhecido'}`);
          return;
        }
        
        console.log('Nota criada com sucesso:', data);
        
        // Adiciona a nota localmente para atualização imediata na UI
        setNotes((prev) => [novaNotaObj as Nota, ...prev]);
        addToast('success', "Nota criada com sucesso!");
      } catch (err) {
        console.error("Erro ao criar nota:", err);
        console.error("Tipo do erro:", typeof err);
        console.error("String do erro:", JSON.stringify(err, null, 2));
        addToast('error', `Erro ao criar nota: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }
      setShowModal(false);
      setNovaNota({ titulo: '', texto: '', cor: 'bg-yellow-500', coluna: 'lembretes', prioridade: 'Média' });
      setNotaEditando(null);
      return;
    }

    // Atualização usando o padrão requisitado
    const dadosNota = {
      titulo: novaNota.titulo,
      texto: novaNota.texto,
      prioridade: novaNota.prioridade,
      cor: novaNota.cor,
      coluna: novaNota.coluna,
    };

    console.log('Tentando atualizar nota com dados:', dadosNota);
    console.log('ID da nota:', notaEditando.id);

    try {
      const { data, error: erroNota } = await supabase
        .from("notas_dashboard")
        .update(dadosNota)
        .eq("id", notaEditando.id)
        .select();

      if (erroNota) {
        console.error('Erro ao salvar nota:', erroNota);
        console.error('Tipo do erro:', typeof erroNota);
        console.error('String do erro:', JSON.stringify(erroNota, null, 2));
        console.error('Detalhes do erro:', {
          message: erroNota.message,
          details: erroNota.details,
          hint: erroNota.hint,
          code: erroNota.code
        });
        addToast('error', `Erro ao atualizar nota: ${erroNota.message || 'Erro desconhecido'}`);
      } else {
        console.log("Nota atualizada com sucesso:", data);
        addToast('success', "Nota atualizada com sucesso!");
        setNotes((prev) =>
          prev.map((n) =>
            n.id === notaEditando.id
              ? {
                  ...n,
                  titulo: novaNota.titulo,
                  texto: novaNota.texto,
                  cor: novaNota.cor,
                  prioridade: novaNota.prioridade,
                  coluna: novaNota.coluna,

                }
              : n
          )
        );
      }
    } catch (err) {
      console.error("Erro ao atualizar nota:", err);
      console.error("Tipo do erro:", typeof err);
      console.error("String do erro:", JSON.stringify(err, null, 2));
      addToast('error', `Erro ao atualizar nota: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }

    setShowModal(false);
    setNovaNota({ titulo: '', texto: '', cor: 'bg-yellow-500', coluna: 'lembretes', prioridade: 'Média' });
    setNotaEditando(null);
  };

  const sensors = useSensors(useSensor(PointerSensor));

  // Função para lidar com o fim do drag and drop (localizada)
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    console.log('Drag end - Active:', active.id, 'Over:', over.id);

    const isColuna = (id: string) => String(id).startsWith('coluna-');

    // Mover coluna
    if (isColuna(String(active.id)) && isColuna(String(over.id))) {
      console.log('Movendo coluna');
      const activeIndex = colunas.findIndex((c) => `coluna-${c}` === String(active.id));
      const overIndex = colunas.findIndex((c) => `coluna-${c}` === String(over.id));
      
      console.log('Índices - Active:', activeIndex, 'Over:', overIndex);
      
      if (activeIndex !== -1 && overIndex !== -1) {
        const novasColunas = arrayMove(colunas, activeIndex, overIndex);
        console.log('Nova ordem das colunas:', novasColunas);
        setColunas(novasColunas);
        await salvarColunasNoBanco(novasColunas);
      } else {
        console.error('Índices inválidos para mover coluna');
      }
      return;
    }

    // Novo bloco: tratar movimentação entre colunas explicitamente
    if (!isColuna(String(active.id)) && !isColuna(String(over.id))) {
      const notaMovida = notes.find((n) => n.id === String(active.id));
      const notaAlvo = notes.find((n) => n.id === String(over.id));

      if (!notaMovida || !notaAlvo) return;

      const novaColuna = notaAlvo.coluna;

      // Atualiza a coluna da nota movida (caso tenha mudado)
      const novaNotaMovida = { ...notaMovida, coluna: novaColuna };

      // Atualiza lista temporária com a nota movida atualizada
      const notasTemp = notes.map((n) => (n.id === notaMovida.id ? novaNotaMovida : n));

      // Filtra as notas da nova coluna
      const notasNaColuna = notasTemp
        .filter((n) => n.coluna === novaColuna)
        .sort((a, b) => a.pos_x - b.pos_x);

      // Garante que a nota movida está na lista
      if (!notasNaColuna.find((n) => n.id === String(active.id))) {
        notasNaColuna.push(novaNotaMovida);
      }

      const activeIndex = notasNaColuna.findIndex((n) => n.id === String(active.id));
      const overIndex = notasNaColuna.findIndex((n) => n.id === String(over.id));
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

  // Função para excluir nota individual com feedback e atualização
  const excluirNota = async (idNota: string) => {
    try {
      const { error } = await supabase.from("notas_dashboard").delete().eq("id", idNota);
      if (error) throw error;
      // Atualiza a lista localmente para refletir imediatamente
      setNotes((prev) => prev.filter((n) => n.id !== idNota));
      addToast('success', 'Nota excluída com sucesso!');
    } catch (error) {
      console.error("Erro ao excluir nota:", error);
      throw error;
    }
  };

  // Modal de exclusão de nota
  const [exibirExcluirNotaModal, setExibirExcluirNotaModal] = useState(false);

  // Função para confirmar exclusão da nota selecionada (chamada pela modal)
  const handleConfirmarExcluirNota = async (nota: NotaSelecionada | null) => {
    if (!nota) return;
    try {
      await excluirNota(nota.id);
      setExibirExcluirNotaModal(false);
      setNotaSelecionada(null);
    } catch {}
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function SortableNoteCard({ id, children }: { id: string; children: (opts: { isDragging: boolean, attributes: any, listeners: any }) => React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const describedById = useId();
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    return (
      <div ref={setNodeRef} style={style}>
        <div {...attributes} {...listeners} aria-describedby={describedById} id={describedById}>
          {children({ isDragging, attributes, listeners })}
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
    children: (opts: { attributes: any, listeners: any }) => React.ReactNode;
    className?: string;
  }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const describedById = useId();
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={className}
        id={describedById}
      >
        {children({ attributes, listeners })}
      </div>
    );
  }





  // Checagem de carregamento e autenticação
  if (carregando || !session?.user) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <ProtectedArea area="lembretes">
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
                  {colunas.map((coluna, index) => {
                    // Porcentagem demonstrativa para progresso
                    const percentualConcluido = 50;
                    const notasDaColuna = notes.filter((n) => n.coluna === coluna);
                    return (
                      <SortableColunaCard
                        key={`coluna-${coluna}`}
                        id={`coluna-${coluna}`}
                        className="bg-white border border-zinc-200 rounded-xl shadow-md flex flex-col transition-all"
                      >
                        {({ attributes, listeners }) => (
                          <>
                            <div
                              className="px-4 py-3 border-b border-zinc-100 font-semibold text-zinc-800 flex justify-between items-center"
                            >
                              <div className="flex items-center gap-2">
                                <span>{colunas[index]}</span>
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setModalColunaAberta({ index, valor: colunas[index] });
                                  }}
                                  className="text-gray-400 hover:text-gray-600 transition p-1 rounded hover:bg-gray-100"
                                  aria-label="Editar título da coluna"
                                >
                                  <Pencil size={14} />
                                </button>
                              </div>
                            </div>
                            {/* Drag handle aprimorado */}
                            <div className="flex justify-center my-2">
                              <button
                                {...attributes}
                                {...listeners}
                                className="flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200 cursor-grab transition"
                                aria-label="Arraste para mover a coluna"
                              >
                                <Move size={16} className="text-gray-500" />
                                <span className="text-xs font-medium text-gray-600 select-none">
                                  Segure e arraste
                                </span>
                              </button>
                            </div>
                            {/* Barra de progresso da coluna */}
                            <div className="w-full px-4 mb-2">
                              <div className="text-xs text-gray-600 mb-1 text-center">
                                {Math.round(percentualConcluido)}% concluído
                              </div>
                              <div className="w-full h-2 bg-gray-200 rounded-full">
                                <div
                                  className="h-2 bg-green-500 rounded-full transition-all duration-300"
                                  style={{ width: `${percentualConcluido}%` }}
                                />
                              </div>
                            </div>

                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event: DragEndEvent) => {
                              const { active, over } = event;
                              if (!over || active.id === over.id) return;
                              const isColuna = (id: string) => String(id).startsWith('coluna-');
                              if (isColuna(String(active.id)) && isColuna(String(over.id))) {
                                const activeIndex = colunas.findIndex((c) => `coluna-${c}` === String(active.id));
                                const overIndex = colunas.findIndex((c) => `coluna-${c}` === String(over.id));
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
                                items={notasDaColuna
                                  .sort((a, b) => a.pos_x - b.pos_x)
                                  .map((n) => n.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                                  <AnimatePresence>
                                    {notasDaColuna
                                      .sort((a, b) => a.pos_x - b.pos_x)
                                      .map((nota, index) => (
                                        <SortableNoteCard key={nota.id || `nota-${index}`} id={nota.id}>
                                          {({ isDragging }) =>
                                            isDragging ? (
                                              <motion.div
                                                layout
                                                initial={false}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0 }}
                                                whileTap={{ scale: 1.02 }}
                                                transition={{
                                                  duration: 0.15,
                                                  ease: 'easeOut',
                                                }}
                                              >
                                                <div className="flex rounded-lg shadow-md hover:shadow-lg bg-white transition-shadow duration-200 overflow-hidden cursor-pointer relative">
                                                  <div className={`w-1 ${nota.cor}`} />
                                                  <div className="flex-1 p-4">
                                                    <div className="flex items-start justify-between">
                                                      <p className="text-base font-semibold">{nota.titulo}</p>
                                                      {/* Ícones de editar e excluir alinhados à direita */}
                                                      <div className="flex gap-2 ml-2">
                                                        <button
                                                          className="text-gray-400 hover:text-primary transition-colors duration-150"
                                                          type="button"
                                                          onPointerDown={e => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            setNovaNota({
                                                              titulo: nota.titulo,
                                                              texto: nota.texto,
                                                              cor: nota.cor,
                                                              coluna: nota.coluna,
                                                              prioridade: nota.prioridade || 'Média',
                                                            });
                                                            setNotaEditando({
                                                              id: nota.id,
                                                              titulo: nota.titulo,
                                                              texto: nota.texto,
                                                              cor: nota.cor,
                                                              coluna: nota.coluna,
                                                              prioridade: nota.prioridade,
                                                              data: nota.data_criacao,
                                                              data_criacao: nota.data_criacao,
                                                            });
                                                            setShowModal(true);
                                                          }}
                                                        >
                                                          <Pencil size={16} />
                                                        </button>
                                                      </div>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-3">{nota.texto}</p>

                                                    {/* Data e prioridade */}
                                                    <div className="flex justify-between items-end mt-4">
                                                      <span className="text-xs text-gray-500">
                                                        {formatarData(nota.data_criacao)}
                                                      </span>
                                                      <span
                                                        className={`text-xs font-semibold px-2 py-1 rounded ${
                                                          nota.prioridade?.toLowerCase() === 'alta'
                                                            ? 'bg-red-100 text-red-600'
                                                            : nota.prioridade?.toLowerCase() === 'média'
                                                            ? 'bg-yellow-100 text-yellow-600'
                                                            : 'bg-green-100 text-green-600'
                                                        }`}
                                                      >
                                                        {nota.prioridade}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </motion.div>
                                            ) : (
                                              <div className="flex rounded-lg shadow-md hover:shadow-lg bg-white transition-shadow duration-200 overflow-hidden cursor-pointer relative">
                                                <div className={`w-1 ${nota.cor}`} />
                                                <div className="flex-1 p-4">
                                                  <div className="flex items-start justify-between">
                                                    <p className="text-base font-semibold">{nota.titulo}</p>
                                                    {/* Ícones de editar e excluir alinhados à direita */}
                                                    <div className="flex gap-2 ml-2">
                                                      <button
                                                        className="text-gray-400 hover:text-primary transition-colors duration-150"
                                                        type="button"
                                                        onPointerDown={e => {
                                                          e.stopPropagation();
                                                          e.preventDefault();
                                                          setNovaNota({
                                                            titulo: nota.titulo,
                                                            texto: nota.texto,
                                                            cor: nota.cor,
                                                            coluna: nota.coluna,
                                                            prioridade: nota.prioridade || 'Média',
                                                          });
                                                          setNotaEditando({
                                                            id: nota.id,
                                                            titulo: nota.titulo,
                                                            texto: nota.texto,
                                                            cor: nota.cor,
                                                            coluna: nota.coluna,
                                                            prioridade: nota.prioridade,
                                                            data: nota.data_criacao,
                                                            data_criacao: nota.data_criacao,
                                                          });
                                                          setShowModal(true);
                                                        }}
                                                      >
                                                        <Pencil size={16} />
                                                      </button>
                                                    </div>
                                                  </div>
                                                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">{nota.texto}</p>

                                                  {/* Data e prioridade */}
                                                  <div className="flex justify-between items-end mt-4">
                                                    <span className="text-xs text-gray-500">
                                                      {formatarData(nota.data_criacao)}
                                                    </span>
                                                    <span
                                                      className={`text-xs font-semibold px-2 py-1 rounded ${
                                                        nota.prioridade?.toLowerCase() === 'alta'
                                                          ? 'bg-red-100 text-red-600'
                                                          : nota.prioridade?.toLowerCase() === 'média'
                                                          ? 'bg-yellow-100 text-yellow-600'
                                                          : 'bg-green-100 text-green-600'
                                                      }`}
                                                    >
                                                      {nota.prioridade}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            )
                                          }
                                        </SortableNoteCard>
                                      ))}
                                  </AnimatePresence>
                                </div>
                              </SortableContext>
                            </DndContext>

                            <div className="border-t border-zinc-100 px-4 py-2 flex items-center justify-end gap-2">
                              <button
                                type="button"
                                className="text-xs text-zinc-600 hover:text-zinc-900 transition"
                                onMouseDown={() => {
                                  setNovaNota({ titulo: '', texto: '', cor: 'bg-yellow-500', coluna, prioridade: 'Média' });
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
                                  const confirmed = await confirm({
                                    title: 'Excluir coluna',
                                    message: `Tem certeza que deseja excluir a coluna "${coluna}"?`,
                                    confirmText: 'Excluir',
                                    cancelText: 'Cancelar',
                                  });
                                  if (confirmed) {
                                    const novas = colunas.filter((_, i) => i !== index);
                                    setColunas(novas);
                                    await removerColuna(coluna);
                                    salvarColunasNoBanco(novas);
                                    setNotes((prev) => prev.filter((n) => n.coluna !== coluna));
                                  }
                                }}
                              >
                                Excluir coluna
                              </button>
                            </div>
                          </>
                        )}
                      </SortableColunaCard>
                    );
                  })}
                  <div className="min-w-[250px]">
                    <button
                      onClick={async () => {
                        const nova = prompt('Nome da nova coluna');
                        if (nova && !colunas.includes(nova)) {
                          const novas = [...colunas, nova.toLowerCase()];
                          setColunas(novas);
                          await criarColuna(nova.toLowerCase());
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
            <EditarNotaModal
              notaEditando={notaEditando}
              novaNota={novaNota}
              setNovaNota={setNovaNota}
              setShowModal={setShowModal}
              salvarOuAtualizarNota={salvarOuAtualizarNota}
              onClose={() => setShowModal(false)}
              setExibirExcluirNotaModal={setExibirExcluirNotaModal}
              setNotaSelecionada={setNotaSelecionada}
            />
          )}
          {/* Modal para editar título da coluna */}
          {modalColunaAberta && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-lg flex flex-col gap-4">
                <h2 className="text-lg font-semibold">Editar título da coluna</h2>
                <input
                  type="text"
                  value={modalColunaAberta.valor}
                  onChange={e => setModalColunaAberta(m => m ? { ...m, valor: e.target.value } : m)}
                  className="border rounded p-2 text-sm"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm"
                    onClick={() => setModalColunaAberta(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                    onClick={async () => {
                      const { index, valor } = modalColunaAberta;
                      if (valor.trim() && valor !== colunas[index]) {
                        handleColunaTituloChange(index, valor);
                        await salvarTituloColuna(index, valor);
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
          {/* Modal de confirmação de exclusão */}
          <ExcluirNotaModal
            isOpen={exibirExcluirNotaModal}
            onClose={() => setExibirExcluirNotaModal(false)}
            onConfirm={() => handleConfirmarExcluirNota(notaSelecionada)}
          />
          {/* ToastContainer para notificações */}
          {/* Remover ToastContainer do react-toastify */}
        </div>
      </MenuLayout>
    </ProtectedArea>
  );
}

// Modal de edição de nota extraído para facilitar lógica do botão de confirmação
function EditarNotaModal({
  notaEditando,
  novaNota,
  setNovaNota,
  setShowModal,
  salvarOuAtualizarNota,
  onClose,
  setExibirExcluirNotaModal,
  setNotaSelecionada,
}: {
  notaEditando: NotaEditando | null;
  novaNota: {
    titulo: string;
    texto: string;
    cor: string;
    coluna: string;
    prioridade: string;
  };
  setNovaNota: (v: {
    titulo: string;
    texto: string;
    cor: string;
    coluna: string;
    prioridade: string;
  }) => void;
  setShowModal: (v: boolean) => void;
  salvarOuAtualizarNota: () => void;
  onClose: () => void;
  setExibirExcluirNotaModal: (v: boolean) => void;
  setNotaSelecionada: (v: NotaSelecionada | null) => void;
}) {
  return (
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
              if (typeof setNovaNota === "function") setNovaNota({
                titulo: '',
                texto: '',
                cor: 'bg-yellow-500',
                coluna: 'lembretes',
                prioridade: 'Média',
              });
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
        {/* Botão de exclusão visível dentro da modal de edição */}
        {notaEditando && (
          <button
            className="bg-red-500 text-white px-4 py-2 rounded mt-4"
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
              setTimeout(() => {
                setExibirExcluirNotaModal(true);
              }, 200);
            }}
          >
            Excluir Nota
          </button>
        )}
      </div>
    </div>
  );
}

// Modal de confirmação de exclusão de nota
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Confirmar Exclusão</h2>
        <p className="text-base text-gray-800 mb-4">Tem certeza que deseja excluir esta nota?</p>
        <div className="flex gap-2 mt-4 justify-end">
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
            onClick={onConfirm}
          >
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
}