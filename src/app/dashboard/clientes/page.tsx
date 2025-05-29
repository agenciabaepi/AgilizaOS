'use client';
import { useState, useEffect } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import Link from 'next/link';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye } from 'react-icons/fi';
import { FiUsers, FiCalendar, FiClock } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { useSession } from '@supabase/auth-helpers-react';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });
import { Cliente } from '@/types/cliente';
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import { Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState as useStateFragment } from 'react';

function ConfirmModal({ isOpen, onClose, onConfirm, clienteNome }) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {/* Fundo removido */}
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left shadow-xl transition-all">
                <Dialog.Title className="text-lg font-medium text-gray-900">
                  Confirmar Exclusão
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Tem certeza que deseja excluir o cliente <span className="font-semibold">{clienteNome}</span>?
                  </p>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    onClick={onConfirm}
                  >
                    Excluir
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default function ClientesPage() {
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  // Ordem fixa por padrão: numero_cliente descendente
  // const [ordenarPor, setOrdenarPor] = useState('created_at');
  // const [ordemAscendente, setOrdemAscendente] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState('');
  const [dataFiltro, setDataFiltro] = useState('');
  const [cidadeFiltro, setCidadeFiltro] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const limite = 10; // Número de clientes por página
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [totalClientes, setTotalClientes] = useState(0);
  const [clientesMesAtual, setClientesMesAtual] = useState(0);
  const [clientesUltimos7Dias, setClientesUltimos7Dias] = useState(0);

  const series = [totalClientes, clientesMesAtual, clientesUltimos7Dias];

  const optionsPizza = {
    chart: {
      type: 'donut',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
        animateGradually: {
          enabled: true,
          delay: 150
        },
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      }
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '16px',
              fontWeight: 600
            }
          }
        }
      }
    },
    labels: ['Total', 'Este mês', 'Últimos 7 dias'],
    colors: ['#6366F1', '#10B981', '#F59E0B'],
    legend: {
      position: 'bottom',
    },
    dataLabels: {
      enabled: true,
      formatter: function (val) {
        return val.toFixed(1) + "%";
      },
      style: {
        fontSize: '16px',
        fontWeight: 'bold'
      }
    },
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 300
        },
        legend: {
          position: 'bottom'
        }
      }
    }]
  };
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null);

  // Novos estados para modal de exclusão em massa
  const [modalExclusaoMassaOpen, setModalExclusaoMassaOpen] = useState(false);
  const [confirmarExclusaoMassa, setConfirmarExclusaoMassa] = useState(() => () => {});

  const router = useRouter();

  const session = useSession();

  useEffect(() => {
    const fetchClientes = async () => {
      setCarregando(true);
      const from = (paginaAtual - 1) * limite;
      const to = from + limite - 1;

      const { data, error, count } = await supabase
        .from('clientes')
        .select('*', { count: 'exact' })
        .order('numero_cliente', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Erro ao buscar clientes:', error);
      } else {
        setClientes(data || []);
        setTotalPaginas(Math.ceil((count || 0) / limite));
        setTotalClientes(count || 0);

        const agora = new Date();
        const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
        const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const { count: countMes, error: errorMes } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', inicioDoMes);

        if (errorMes) {
          console.error('Erro ao contar clientes do mês:', errorMes);
        } else {
          setClientesMesAtual(countMes || 0);
        }

        const { count: count7Dias, error: error7Dias } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', seteDiasAtras);

        if (error7Dias) {
          console.error('Erro ao contar clientes dos últimos 7 dias:', error7Dias);
        } else {
          setClientesUltimos7Dias(count7Dias || 0);
        }
      }
      setCarregando(false);
    };
    fetchClientes();
  }, [paginaAtual]);

  const solicitarExclusao = (cliente: Cliente) => {
    setClienteParaExcluir(cliente);
    setModalOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!clienteParaExcluir) return;

    const { error } = await supabase.from('clientes').delete().eq('id', clienteParaExcluir.id);
    if (error) {
      toast.error('Erro ao excluir cliente: ' + error.message);
    } else {
      toast.success('Cliente excluído com sucesso!');
      setClientes(clientes.filter(c => c.id !== clienteParaExcluir.id));
    }
    setModalOpen(false);
  };

  const clientesFiltrados = clientes.filter((c) =>
    (statusFiltro ? c.status === statusFiltro : true) &&
    (cidadeFiltro ? c.cidade === cidadeFiltro : true) &&
    (
      dataFiltro
        ? new Date(c.created_at) >= new Date(Date.now() - Number(dataFiltro) * 24 * 60 * 60 * 1000)
        : true
    ) &&
    (
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.telefone.includes(busca) ||
      c.celular.includes(busca) ||
      c.email.toLowerCase().includes(busca.toLowerCase()) ||
      c.documento.includes(busca)
    )
  );

  // Função para exportar os clientes filtrados para CSV
  const exportarCSV = () => {
    const cabecalho = 'Nome,Telefone,Celular,Email,Documento\n';
    const linhas = clientesFiltrados.map(c =>
      `${c.nome},${c.telefone},${c.celular},${c.email},${c.documento}`
    ).join('\n');

    const blob = new Blob([cabecalho + linhas], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'clientes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Clientes</h1>
        <Link
          href={`/dashboard/clientes/novo?atendente=${session?.user?.user_metadata?.nome || ''}`}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
        >
          <FiPlus className="w-6 h-6" />
          Novo Cliente
        </Link>
      </div>

      <div className="mb-6">
        <div className="relative max-w-sm">
          <FiSearch className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full border border-gray-300 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        {/* Ordenação removida/fixada em numero_cliente desc */}
        <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="border border-gray-300 rounded-md px-2 py-1">
          <option value="">Todos</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        <select value={cidadeFiltro} onChange={(e) => setCidadeFiltro(e.target.value)} className="border border-gray-300 rounded-md px-2 py-1">
          <option value="">Todas as Cidades</option>
          <option value="São Paulo">São Paulo</option>
          <option value="Rio de Janeiro">Rio de Janeiro</option>
          <option value="Belo Horizonte">Belo Horizonte</option>
        </select>
        <select value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className="border border-gray-300 rounded-md px-2 py-1">
          <option value="">Todas as Datas</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
        </select>
      </div>

      {selecionados.length > 0 && (
        <div className="flex justify-end gap-2 mb-4 text-sm">
          <button 
            onClick={() => console.log('Exportar selecionados')} 
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Exportar Selecionados
          </button>
          <button 
            onClick={exportarCSV} 
            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          >
            Exportar CSV
          </button>
          <button
            onClick={() => setModalExclusaoMassaOpen(true)}
            className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Excluir Selecionados
          </button>
          <button 
            onClick={() => setSelecionados([])} 
            className="px-3 py-1 bg-gray-300 text-black rounded-md hover:bg-gray-400 transition"
          >
            Limpar Seleção
          </button>
        </div>
      )}

      {carregando ? (
        <div className="bg-white shadow rounded-lg px-6 py-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th>#</th>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Celular</th>
                <th>Email</th>
                <th>Documento</th>
                <th>Status</th>
                <th>Data Cadastro</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="px-1 py-4"><Skeleton width={18} height={18} /></td>
                  <td className="px-1 py-4"><Skeleton width={30} height={14} /></td>
                  <td className="px-1 py-4"><Skeleton width={100} height={14} /></td>
                  <td className="px-1 py-4"><Skeleton width={100} height={14} /></td>
                  <td className="px-1 py-4"><Skeleton width={160} height={14} /></td>
                  <td className="px-1 py-4"><Skeleton width={100} height={14} /></td>
                  <td className="px-1 py-4"><Skeleton width={50} height={18} /></td>
                  <td className="px-1 py-4"><Skeleton width={80} height={14} /></td>
                  <td className="px-1 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <Skeleton width={18} height={18} />
                      <Skeleton width={18} height={18} />
                      <Skeleton width={18} height={18} />
                      <Skeleton width={18} height={18} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg px-4 py-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="relative z-10 align-middle py-3 sticky top-0 z-10 bg-white">
                  <input type="checkbox" onChange={(e) => setSelecionados(e.target.checked ? clientesFiltrados.map(c => c.id) : [])} />
                </th>
                <th className="px-1 py-3 sticky left-0 bg-gray-100 z-10 text-sm text-left font-semibold text-gray-700 sticky top-0 z-10 bg-white">#</th>
                <th className="px-1 py-3 text-sm text-left font-semibold text-gray-700 sticky top-0 z-10 bg-white">Nome</th>
                <th className="px-1 py-3 text-sm text-left font-semibold text-gray-700 sticky top-0 z-10 bg-white">Telefone</th>
                <th className="px-1 py-3 text-sm text-left font-semibold text-gray-700 sticky top-0 z-10 bg-white">WhatsApp</th>
                <th className="px-1 py-3 text-sm text-left font-semibold text-gray-700 sticky top-0 z-10 bg-white">Email</th>
                <th className="px-1 py-3 text-sm text-left font-semibold text-gray-700 sticky top-0 z-10 bg-white">Documento</th>
                <th className="px-1 py-3 text-sm text-left font-semibold text-gray-700 sticky top-0 z-10 bg-white">Cadastrado por</th>
                <th className="px-1 py-3 text-sm text-left font-semibold text-gray-700 sticky top-0 z-10 bg-white">Status</th>
                <th className="px-1 py-3 text-sm text-left font-semibold text-gray-700 sticky top-0 z-10 bg-white">Data Cadastro</th>
                <th className="px-1 py-3 text-sm text-right font-semibold text-gray-700 sticky top-0 z-10 bg-white">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((c, idx) => (
                <tr
                  key={c.id}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-50 transition-transform transform hover:scale-[1.005] border-b border-gray-100`}
                >
                  <td className="relative z-10 align-middle py-4">
                    <input
                      type="checkbox"
                      checked={selecionados.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelecionados([...selecionados, c.id]);
                        else setSelecionados(selecionados.filter(id => id !== c.id));
                      }}
                    />
                  </td>
                  <td className="px-1 py-4 font-medium text-gray-700 text-sm align-middle">{c.numero_cliente}</td>
                  <td className="px-1 py-4 font-medium text-gray-700 text-sm align-middle">{c.nome}</td>
                  <td className="px-1 py-4 font-medium text-gray-700 text-sm align-middle">{c.telefone}</td>
                  <td className="px-1 py-4 font-medium text-gray-700 text-sm align-middle">{c.celular}</td>
                  <td className="px-1 py-4 font-medium text-gray-700 text-sm align-middle">{c.email}</td>
                  <td className="px-1 py-4 font-medium text-gray-700 text-sm align-middle">{c.documento}</td>
                  <td className="px-1 py-4 font-medium text-gray-700 text-sm align-middle">{c.cadastrado_por || '—'}</td>
                  <td className="px-1 py-4 align-middle">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      c.status === 'ativo' ? 'bg-green-100 text-green-800' :
                      c.status === 'inativo' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-1 py-4 font-medium text-gray-700 text-sm align-middle">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-1 py-4 flex justify-end gap-3 align-middle">
                    <Link
                      href={`/dashboard/clientes/${c.id}`}
                      className="text-blue-600"
                      title="Visualizar cliente"
                    >
                      <FiEye className="w-5 h-5 hover:text-gray-700" />
                    </Link>
                    <Link
                      href={`/dashboard/clientes/${c.id}/editar`}
                      className="text-yellow-600"
                      title="Editar cliente"
                    >
                      <FiEdit2 className="w-5 h-5 hover:text-gray-700" />
                    </Link>
                    <button
                      className="text-red-600 hover:scale-110 transform transition"
                      onClick={() => solicitarExclusao(c)}
                      title="Excluir cliente"
                    >
                      <FiTrash2 className="w-5 h-5 hover:text-gray-700" />
                    </button>
                    <a
                      href={`https://wa.me/${c.celular.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:scale-110 transform transition"
                      aria-label={`Enviar mensagem para ${c.nome}`}
                      title="Enviar WhatsApp"
                    >
                      <FaWhatsapp className="w-5 h-5 hover:text-gray-700" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Paginação */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))}
          disabled={paginaAtual === 1}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="px-3 py-1">{paginaAtual} de {totalPaginas}</span>
        <button
          onClick={() => setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))}
          disabled={paginaAtual === totalPaginas}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Próximo
        </button>
      </div>

      {/* Gráfico de Pizza - Resumo de Clientes em 3 Cards */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Resumo de Clientes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 min-h-[280px] flex flex-col justify-center items-center gap-2">
            <FiUsers size={20} className="text-indigo-600" />
            <h3 className="text-md font-semibold text-center">Total</h3>
            {totalClientes > 0 ? (
              <Chart
                options={{ ...optionsPizza, labels: ['Total'], colors: ['#1e3bef'] }}
                series={[totalClientes]}
                type="donut"
                width={220}
                height={220}
              />
            ) : (
              <p className="text-gray-400 mt-4">Sem dados</p>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-4 min-h-[280px] flex flex-col justify-center items-center gap-2">
            <FiCalendar size={20} className="text-green-600" />
            <h3 className="text-md font-semibold text-center">Este mês</h3>
            {clientesMesAtual > 0 ? (
              <Chart
                options={{ ...optionsPizza, labels: ['Este mês'], colors: ['#10B981'] }}
                series={[clientesMesAtual]}
                type="donut"
                width={220}
                height={220}
              />
            ) : (
              <p className="text-gray-400 mt-4">Sem dados</p>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-4 min-h-[280px] flex flex-col justify-center items-center gap-2">
            <FiClock size={20} className="text-yellow-600" />
            <h3 className="text-md font-semibold text-center">Últimos 7 dias</h3>
            {clientesUltimos7Dias > 0 ? (
              <Chart
                options={{ ...optionsPizza, labels: ['Últimos 7 dias'], colors: ['#F59E0B'] }}
                series={[clientesUltimos7Dias]}
                type="donut"
                width={220}
                height={220}
              />
            ) : (
              <p className="text-gray-400 mt-4">Sem dados</p>
            )}
          </div>
        </div>
      </div>


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
        transition={Slide}
        theme="colored"
      />
      <ConfirmModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmarExclusao}
        clienteNome={clienteParaExcluir?.nome || ''}
      />
      {/* Modal para exclusão em massa */}
      <ConfirmModal 
        isOpen={modalExclusaoMassaOpen}
        onClose={() => setModalExclusaoMassaOpen(false)}
        onConfirm={async () => {
          const { error } = await supabase
            .from('clientes')
            .delete()
            .in('id', selecionados);
          if (error) {
            toast.error('Erro ao excluir clientes selecionados: ' + error.message);
          } else {
            toast.success('Clientes excluídos com sucesso!');
            setClientes(clientes.filter(c => !selecionados.includes(c.id)));
            setSelecionados([]);
          }
          setModalExclusaoMassaOpen(false);
        }}
        clienteNome={`${selecionados.length} cliente(s) selecionado(s)`}
      />
    </div>
  );
}
// O botão "Excluir Selecionados" permite a exclusão em massa dos clientes marcados na lista.
// Ao ser acionado, remove os clientes selecionados do banco, atualiza a lista exibida e limpa a seleção.