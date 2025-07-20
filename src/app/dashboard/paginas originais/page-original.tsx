
'use client';
export const dynamic = 'force-dynamic';


import React, { useEffect, useState, useId } from 'react';
import { useRouter } from "next/navigation";
import clsx from "clsx";
import MenuLayout from '@/components/MenuLayout';
import { format } from 'date-fns';
import { toast, ToastContainer } from 'react-toastify';
// Função para criar uma nova coluna
// Precisa de acesso ao user, então será definida dentro do componente DashboardPage

// Função para remover uma coluna
// Também depende de empresa_id, então será definida dentro do componente DashboardPage
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
import { Book, Pencil, AlertTriangle, Circle, CheckCircle, Trash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const empresa_id = empresaData?.id;
  const supabase = useSupabaseClient();
  const router = useRouter();

  // Função para criar uma nova coluna (agora dentro do componente, com acesso ao user)
  const criarColuna = async (titulo: string, cor: string = "#cffb6d") => {
    // Obter empresa_id do usuário autenticado
    const empresa_id_local = user?.user_metadata?.empresa_id;
    if (!empresa_id_local) {
      toast.error("Erro: empresa não identificada.");
      return;
    }
    if (!titulo) return;
    try {
      const { data, error } = await supabase
        .from("colunas_dashboard")
        .insert([
          {
            titulo,
            cor,
            empresa_id,
            criado_por: user?.id || null,
          },
        ]);

      if (error) {
        // erro silencioso
        // toast.error('Erro ao criar coluna: ' + JSON.stringify(error));
      } else {
        toast.success("Coluna criada com sucesso!");
        // setTitulo(""); // Se você tiver esse estado, descomente
        // setCor("#cffb6d"); // Se você tiver esse estado, descomente
        await fetchColunas();
      }
    } catch (err: any) {
      // erro silencioso
      // console.error("Erro inesperado ao criar coluna:", err?.message || err);
      // toast.error("Erro inesperado ao criar coluna.");
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
      toast.success("Coluna excluída com sucesso!");
    } else {
      toast.error("Erro ao excluir coluna.");
    }
  };
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
    texto: '',
    cor: 'bg-yellow-500',
    coluna: 'lembretes',
    prioridade: 'Média',
  });
  // Estado para nota em edição
  const [notaEditando, setNotaEditando] = useState<any | null>(null);

  // --- Modal de edição de nota (exemplo de integração de "EditarNotaModal") ---
  // Estados para modal de edição e nota selecionada
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<any | null>(null);

  // Nova função handleDeleteNota conforme solicitado
  const handleDeleteNota = async () => {
    if (!notaSelecionada) return

    try {
      await deleteNota(notaSelecionada.id)
      setNotaSelecionada(null)
      setShowEditModal(false)
      toast.dismiss()
      toast.success("Nota excluída com sucesso!")
    } catch (error) {
      console.error("Erro ao excluir nota:", error)
      toast.error("Erro ao excluir nota.")
    }
  };

  // Função para criar ou atualizar nota
  const salvarOuAtualizarNota = async () => {
    // Adiciona empresaId do contexto de autenticação
    const empresaId = empresaData?.id;
    if (!empresaId || !novaNota.titulo.trim()) return;

    const nota = notaEditando;

    if (!nota || !nota.id) {
      // Criar nova nota
      const novaNotaObj = {
        ...novaNota,
        id: uuidv4(), // Certifique-se de importar uuid
        empresa_id: empresaId,
        responsavel: session?.user?.email ?? '',
        data_criacao: new Date().toISOString(),
        pos_x: 0,
        pos_y: 0,
      };
      // Adiciona o console.log antes do insert
      console.log('Dados a serem salvos:', novaNotaObj);
      // Salve a nova nota aqui usando a lógica apropriada
      try {
        const { error: erroNota } = await supabase.from('notas_dashboard').insert([{
          ...novaNotaObj,
          texto: novaNotaObj.texto,
        }]);
        if (erroNota) {
          console.error('Erro ao salvar nota:', erroNota.message, erroNota.details, erroNota.hint);
          toast.error('Erro ao salvar nota.');
          return;
        }
        // Adiciona a nota localmente para atualização imediata na UI
        setNotes((prev) => [
          {
            ...novaNotaObj,
            texto: novaNotaObj.texto,
          },
          ...prev,
        ]);
        toast.success("Nota criada com sucesso!");
      } catch (err) {
        console.error("Erro ao criar nota:", err);
        toast.error('Erro ao criar nota.');
      }
      setShowModal(false);
      setNovaNota({ titulo: '', texto: '', cor: 'bg-yellow-500', coluna: 'lembretes', prioridade: 'Média' });
      setNotaEditando(null);
      return;
    }

    // Atualização usando o padrão requisitado
    const notaAtual = {
      id: notaEditando.id,
      titulo: novaNota.titulo,
      texto: novaNota.texto,
      prioridade: novaNota.prioridade,
      cor: novaNota.cor,
      concluido: notaEditando.concluido ?? false,
      data: notaEditando.data ?? notaEditando.data_criacao,
      coluna: novaNota.coluna,
    };
    const { id, data, ...dadosNota } = notaAtual;
    if (!id) {
      // Nunca deve ocorrer aqui, mas por segurança
      console.error("ID da nota está ausente. Impossível atualizar.");
      return;
    }

    // Adiciona o console.log antes do update
    console.log('Dados a serem salvos:', dadosNota);
    try {
      const { error: erroNota } = await supabase
        .from("notas_dashboard")
        .update(dadosNota)
        .eq("id", id)
        .throwOnError();

      if (erroNota) {
        console.error('Erro ao salvar nota:', erroNota.message, erroNota.details, erroNota.hint);
        toast.error('Erro ao atualizar nota.');
      } else {
        console.log("Nota atualizada com sucesso!");
        toast.success("Nota atualizada com sucesso!");
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id
              ? {
                  ...n,
                  titulo: novaNota.titulo,
                  texto: novaNota.texto,
                  cor: novaNota.cor,
                  prioridade: novaNota.prioridade,
                  coluna: novaNota.coluna,
                  concluido: notaEditando.concluido ?? false,
                  data: notaEditando.data ?? notaEditando.data_criacao,
                }
              : n
          )
        );
      }
    } catch (err) {
      console.error("Erro ao atualizar nota:", err);
      toast.error('Erro ao atualizar nota.');
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
  // Função para excluir nota individual com feedback e atualização
  const excluirNota = async (idNota: string) => {
    try {
      const { error } = await supabase.from("notas_dashboard").delete().eq("id", idNota);
      if (error) throw error;
      // Atualiza a lista localmente para refletir imediatamente
      setNotes((prev) => prev.filter((n) => n.id !== idNota));
    } catch (error) {
      console.error("Erro ao excluir nota:", error);
      throw error;
    }
  };

  // Modal de exclusão de nota
  const [exibirExcluirNotaModal, setExibirExcluirNotaModal] = useState(false);

  // Função para confirmar exclusão da nota selecionada (chamada pela modal)
  const handleConfirmarExcluirNota = async (nota: any) => {
    if (!nota) return;
    try {
      await excluirNota(nota.id);
      setExibirExcluirNotaModal(false);
      setNotaSelecionada(null);
      toast.dismiss();
      toast.success("Nota excluída com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir nota.");
    }
  };

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
                                <AnimatePresence>
                                  {notes
                                    .filter((nota) => nota.coluna === coluna)
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
                                                        onMouseDown={() => {
                                                          setNovaNota({
                                                            titulo: nota.titulo,
                                                            texto: nota.texto,
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
                                                      {/* Botão de excluir nota removido da listagem */}
                                                    </div>
                                                  </div>
                                                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">{nota.texto}</p>
                                                  {/* Checkbox de concluído */}
                                                  <div className="flex items-center gap-2 mt-3">
                                                    <input
                                                      type="checkbox"
                                                      checked={!!nota.concluida}
                                                      onChange={() => toggleNotaConcluida(nota)}
                                                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                    />
                                                    <span className={clsx("text-sm", { "line-through text-gray-400": nota.concluida })}>
                                                      {nota.concluida ? "Concluída" : "Marcar como concluída"}
                                                    </span>
                                                  </div>
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
                                                      onMouseDown={() => {
                                                        setNovaNota({
                                                          titulo: nota.titulo,
                                                          texto: nota.texto,
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
                                                    {/* Botão de excluir nota removido da listagem */}
                                                  </div>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1 line-clamp-3">{nota.texto}</p>
                                                {/* Checkbox de concluído */}
                                                <div className="flex items-center gap-2 mt-3">
                                                  <input
                                                    type="checkbox"
                                                    checked={!!nota.concluida}
                                                    onChange={() => toggleNotaConcluida(nota)}
                                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                                  />
                                                  <span className={clsx("text-sm", { "line-through text-gray-400": nota.concluida })}>
                                                    {nota.concluida ? "Concluída" : "Marcar como concluída"}
                                                  </span>
                                                </div>
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
                                const confirmacao = window.confirm(`Tem certeza que deseja excluir a coluna "${coluna}"?`);
                                if (confirmacao) {
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
                      );
                    }}
                  </SortableColunaCard>
                ))}
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
            notaSelecionada={notaSelecionada}
          />
        )}
        {/* Modal de confirmação de exclusão */}
        <ExcluirNotaModal
          isOpen={exibirExcluirNotaModal}
          onClose={() => setExibirExcluirNotaModal(false)}
          onConfirm={() => handleConfirmarExcluirNota(notaSelecionada)}
        />
        {/* ToastContainer para notificações */}
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
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
  notaSelecionada,
}: {
  notaEditando: any;
  novaNota: any;
  setNovaNota: (v: any) => void;
  setShowModal: (v: boolean) => void;
  salvarOuAtualizarNota: () => void;
  onClose: () => void;
  setExibirExcluirNotaModal: (v: boolean) => void;
  setNotaSelecionada: (v: any) => void;
  notaSelecionada: any;
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
              // @ts-ignore
              if (typeof setNovaNota === "function") setNovaNota(null);
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
              setNotaSelecionada(notaEditando);
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
  // Função para alternar o status de concluída da nota
  const toggleNotaConcluida = async (nota: any) => {
    const novoValor = !nota.concluida;
    try {
      await supabase
        .from('notas_dashboard')
        .update({ concluida: novoValor })
        .eq('id', nota.id);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === nota.id ? { ...n, concluida: novoValor } : n
        )
      );
    } catch (error) {
      toast.error('Erro ao atualizar status da nota.');
    }
  };