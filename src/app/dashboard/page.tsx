'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import { FiEye, FiEdit, FiPrinter, FiTrash2 } from 'react-icons/fi';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, loading } = auth || {};

  const [empresaNome, setEmpresaNome] = useState<string | null>(null);
  const [nivel, setNivel] = useState<string | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [notaParaExcluir, setNotaParaExcluir] = useState<any | null>(null);

  // Modal de nova nota/edição de nota
  const [showModal, setShowModal] = useState(false);
  const [novaNota, setNovaNota] = useState({
    titulo: '',
    texto: '',
    cor: 'bg-yellow-500'
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
          cor: novaNota.cor
        })
        .eq('id', notaEditando.id);

      if (error) {
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
        responsavel: user?.email || '',
        cor: novaNota.cor,
        empresa_id: empresaId,
        pos_x: 0,
        pos_y: 0,
        data_criacao: new Date().toISOString()
      };

      const { error } = await supabase.from('notas_dashboard').insert([nota]);
      if (error) {
        toast.error('Erro ao salvar nota.');
        return;
      }

      setNotes((prev) => [nota, ...prev]);
      toast.success('Nota adicionada com sucesso!');
    }

    setShowModal(false);
    setNovaNota({ titulo: '', texto: '', cor: 'bg-yellow-500' });
    setNotaEditando(null);
  };

  useEffect(() => {
    if (loading) return; // Aguarda carregamento completo
    if (!user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchEmpresaNome = async () => {
      if (user) {
        const { data } = await supabase
          .from('empresas')
          .select('id, nome')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          setEmpresaNome(data.nome);
          setEmpresaId(data.id);
        }
      }
    };

    fetchEmpresaNome();
  }, [user]);

  useEffect(() => {
    if (!empresaId) return;
    const fetchNotas = async () => {
      const { data, error } = await supabase
        .from('notas_dashboard')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('pos_x', { ascending: true });

      if (data) setNotes(data);
    };
    fetchNotas();
  }, [empresaId]);

useEffect(() => {
  const fetchNivel = async () => {
    if (user) {
      const userIdSanitized = user.id.trim().toLowerCase();
      console.log("user.id:", user.id, "length:", user.id.length);
      console.log("userIdSanitized:", userIdSanitized, "length:", userIdSanitized.length);

      const { data, error } = await supabase
        .from('tecnicos')
        .select('nivel, auth_user_id')
        .ilike('auth_user_id', `%${userIdSanitized}%`)
        .limit(1);

      console.log('Resultado data:', data, 'Erro:', error);
      console.log('Resultado da busca de nivel:', data, error);
      if (data && data.length > 0) {
        console.log("data[0].auth_user_id:", data[0].auth_user_id, "length:", data[0].auth_user_id?.length);
        console.log("Comparando data[0].auth_user_id === user.id:", data[0].auth_user_id === user.id);
        console.log("Nivel retornado:", data[0].nivel);
        setNivel(data[0].nivel);
      } else {
        console.warn("Nenhum técnico encontrado com auth_user_id igual ao:", userIdSanitized);
        setNivel(null);
      }
    }
  };

  fetchNivel();
}, [user]);

  const isTecnico = nivel === 'tecnico';

  useEffect(() => {
    if (isTecnico) {
      router.push('/dashboard/bancada');
    }
  }, [isTecnico, router]);

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

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = notes.findIndex((n) => n.id === active.id);
    const newIndex = notes.findIndex((n) => n.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(notes, oldIndex, newIndex);
    setNotes(reordered);

    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('notas_dashboard')
        .update({ pos_x: i })
        .eq('id', reordered[i].id);
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
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        {children}
      </div>
    );
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="w-full px-6 py-4">
      <h1 className="text-2xl font-bold mb-2">Seja Bem-vindo {empresaNome}</h1>
      <p className="text-sm text-gray-600 mb-6">Usuário: {user?.email}</p>

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


      <div className="bg-yellow-100 border border-yellow-300 rounded-xl shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">🗒️ Anotações Fixas</h2>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={notes.map(n => n.id)} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {notes.map((note) => (
                <SortableNoteCard key={note.id} id={note.id}>
                  <div className="bg-white rounded-lg shadow-md w-60 h-44 cursor-move border border-gray-200 overflow-hidden flex flex-col">
                    <div className={`px-3 py-2 ${note.cor} text-white font-bold text-sm`}>
                      {note.titulo}
                    </div>
                    <div className="p-3 flex flex-col justify-between flex-1">
                      <div className="text-xs text-gray-700 line-clamp-3">{note.texto}</div>
                      <div className="flex justify-end mt-2 gap-2">
                        <button
                          type="button"
                          onMouseDown={() => {
                            setNovaNota({ titulo: note.titulo, texto: note.texto, cor: note.cor });
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
                    </div>
                  </div>
                </SortableNoteCard>
              ))}
              <div
                className="bg-white p-4 rounded-lg shadow-md w-60 h-40 cursor-pointer border border-dashed border-gray-300 flex items-center justify-center hover:bg-gray-50"
                onClick={() => {
                  setNovaNota({ titulo: '', texto: '', cor: 'bg-yellow-500' });
                  setNotaEditando(null);
                  setShowModal(true);
                }}
              >
                <span className="text-sm text-gray-500">+ Nova anotação</span>
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