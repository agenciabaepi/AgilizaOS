'use client';
import Image from 'next/image';
import logo from '@/assets/imagens/logoagiliza.png';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FiHome,
  FiUsers,
  FiBox,
  FiTool,
  FiDollarSign,
  FiFileText,
  FiLogOut,
  FiCheckCircle,
  FiHelpCircle,
  FiUserCheck,
} from 'react-icons/fi';
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

import { Toaster } from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

import { supabase } from '@/lib/supabaseClient';

export default function DashboardPage({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [empresa, setEmpresa] = useState<{ logo_url: string } | null>(null);
  const [isTecnico, setIsTecnico] = useState(false);
  const [checandoPermissao, setChecandoPermissao] = useState(true);
  const [permissaoChecada, setPermissaoChecada] = useState(false);
  const { user } = auth || {};
  const loading = false; // ou ajuste conforme a definição correta do contexto de autenticação
  const router = useRouter();
  const pathname = usePathname();

useEffect(() => {
  if (loading) return; // Aguarda loading terminar

  if (!user) {
    router.push('/login');
    return;
  }

    console.log('user:', user);
    console.log('pathname:', pathname);

    // Protege acesso para técnicos
    const protegerAcesso = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      console.log('currentUser:', currentUser);

      if (!currentUser) {
        console.warn('Usuário não logado ao proteger acesso');
        router.push('/login');
        setChecandoPermissao(false);
        return;
      }

      const userId = String(currentUser.id).trim();
      console.log('userId:', userId, 'tipo:', typeof userId, 'length:', userId.length);
      const { data: tecnico, error: erroTecnico } = await supabase
        .from('tecnicos')
        .select('id, nivel, auth_user_id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (erroTecnico) {
        console.error('Erro ao buscar técnico:', erroTecnico);
      }

      console.log('Resultado técnico:', tecnico);

      if (!tecnico) {
        console.warn(`Nenhum técnico encontrado com auth_user_id igual a: ${userId}`);
      } else {
        console.log(`Técnico encontrado:`, tecnico);
      }

      const isUserTecnico = tecnico?.nivel === 'tecnico';
      console.log('isUserTecnico:', isUserTecnico);
      setIsTecnico(isUserTecnico);

      if (isUserTecnico && pathname !== '/dashboard/bancada') {
        router.push('/dashboard/bancada');
      }
      setChecandoPermissao(false);
    };

    Promise.all([protegerAcesso()]).then(() => {
      setPermissaoChecada(true);
    });
  }, [user, loading, router, pathname]);

  useEffect(() => {
    const fetchEmpresaDoTecnico = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.warn('Usuário não logado ao buscar empresa');
        return;
      }

      console.log('Buscando técnico com auth_user_id:', user.id);

      const { data: tecnico, error: erroTecnico } = await supabase
        .from('tecnicos')
        .select('empresa_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (erroTecnico) {
        console.error('Erro ao buscar técnico:', erroTecnico);
        return;
      }

      console.log('Técnico encontrado:', tecnico);

      if (!tecnico?.empresa_id) {
        console.warn('Técnico não possui empresa_id vinculado');
        return;
      }

      console.log('Buscando empresa com id:', tecnico.empresa_id);

      const { data: empresaData, error: erroEmpresa } = await supabase
        .from('empresas')
        .select('logo_url')
        .eq('id', tecnico.empresa_id)
        .maybeSingle();

      if (erroEmpresa) {
        console.error('Erro ao buscar empresa:', erroEmpresa);
        return;
      }

      if (!empresaData?.logo_url) {
        console.warn('Empresa não possui logo_url');
        return;
      }

      console.log('Setando empresa com logo_url:', empresaData.logo_url);

      setEmpresa(empresaData);
    };

    if (isTecnico) {
      fetchEmpresaDoTecnico();
    }
  }, [isTecnico]);

  useEffect(() => {
    const fetchEmpresaDoMaster = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.warn('Usuário não logado ao buscar empresa');
        return;
      }

      const { data: empresaData, error } = await supabase
        .from('empresas')
        .select('logo_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar empresa do usuário master:', error);
        return;
      }

      if (empresaData) {
        console.log('Setando empresa do master com logo_url:', empresaData.logo_url);
        setEmpresa(empresaData);
      }
    };

    if (!isTecnico) {
      fetchEmpresaDoMaster();
    }
  }, [isTecnico]);

  const rotasPermitidasParaTecnico = ['/dashboard/bancada'];

useEffect(() => {
  if (!permissaoChecada) return;

  if (isTecnico && pathname && !rotasPermitidasParaTecnico.includes(pathname)) {
    router.push('/dashboard/bancada');
  }
}, [isTecnico, pathname, router, permissaoChecada]);

  if (!permissaoChecada) return <p>Carregando...</p>;
  if (loading || checandoPermissao) return <p>Carregando...</p>;
  if (!user) return null;

  // Redireciona técnico caso tente acessar a rota de cadastro de técnicos
  if (isTecnico && pathname && !rotasPermitidasParaTecnico.includes(pathname)) {
    router.push('/dashboard/bancada');
    return null;
  }

  return (
    
    <div className="flex min-h-screen relative z-0 overflow-x-hidden w-full">
      <div className="fixed top-0 left-0 w-full z-60 h-16 bg-[#00117f] text-white flex items-center justify-between px-6">
        {/* Esquerda: Logo */}
        <div className="flex items-center mr-6">
          <Image src={logo} alt="Logo Agiliza" className="h-10 object-contain" />
        </div>

        {/* Direita: Busca + Notificação + Licença + Suporte */}
        <div className="flex items-center gap-4">
          <div className="relative w-40">
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 rounded-full bg-white text-gray-700 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1860fa]"
            />
            <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>

          <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 cursor-pointer hover:bg-gray-200">
            <FiBell className="text-gray-500" size={18} />
          </div>

          <div className="flex items-center gap-2 text-sm text-green-400 font-medium whitespace-nowrap">
            <FiCheckCircle size={16} />
            Licença ativa
          </div>

          <button className="flex items-center gap-2 text-sm text-white hover:text-[#1860fa]">
            <FiHelpCircle size={16} />
            Suporte
          </button>
        </div>
      </div>
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`transition-all duration-500 ease-in-out bg-white shadow-md py-6 px-2 flex flex-col h-screen fixed top-0 left-0 z-50 ${
          expanded ? 'w-64' : 'w-14'
        }`}
      >
        <div className="h-[48px] mb-6" />

        <nav className="space-y-2">
          {isTecnico ? (
            <>
              <button
                onClick={() => router.push('/dashboard/bancada')}
                className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${
                  pathname === '/dashboard/bancada'
                    ? 'bg-[#1860fa] text-white font-semibold'
                    : 'hover:bg-[#1860fa]/10 hover:text-[#1860fa]'
                }`}
              >
                <div className="min-w-[20px]">
                  <FiTool size={20} />
                </div>
                <span
                  className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${
                    expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                  }`}
                >
                  Bancada
                </span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => router.push('/dashboard')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard' ? 'bg-[#1860fa] text-white font-semibold' : 'hover:bg-[#1860fa]/10 hover:text-[#1860fa]'}`}>
                <div className="min-w-[20px]">
                  <FiHome size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Dashboard
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/ordens')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/ordens' ? 'bg-[#1860fa] text-white font-semibold' : 'hover:bg-[#1860fa]/10 hover:text-[#1860fa]'}`}>
                <div className="min-w-[20px]">
                  <FiFileText size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Ordens de Serviço
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/clientes')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/clientes' ? 'bg-[#1860fa] text-white font-semibold' : 'hover:bg-[#1860fa]/10 hover:text-[#1860fa]'}`}>
                <div className="min-w-[20px]">
                  <FiUsers size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Clientes
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/produtos')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/produtos' ? 'bg-[#1860fa] text-white font-semibold' : 'hover:bg-[#1860fa]/10 hover:text-[#1860fa]'}`}>
                <div className="min-w-[20px]">
                  <FiBox size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Produtos/Serviços
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/tecnicos')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/tecnicos' ? 'bg-[#1860fa] text-white font-semibold' : 'hover:bg-[#1860fa]/10 hover:text-[#1860fa]'}`}>
                <div className="min-w-[20px]">
                  <FiUserCheck size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Técnicos
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/financeiro')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/financeiro' ? 'bg-[#1860fa] text-white font-semibold' : 'hover:bg-[#1860fa]/10 hover:text-[#1860fa]'}`}>
                <div className="min-w-[20px]">
                  <FiDollarSign size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Financeiro
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/bancada')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/bancada' ? 'bg-[#1860fa] text-white font-semibold' : 'hover:bg-[#1860fa]/10 hover:text-[#1860fa]'}`}>
                <div className="min-w-[20px]">
                  <FiTool size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Bancada
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/termos')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/termos' ? 'bg-[#1860fa] text-white font-semibold' : 'hover:bg-[#1860fa]/10 hover:text-[#1860fa]'}`}>
                <div className="min-w-[20px]">
                  <FiFileText size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Termos
                </span>
              </button>
              <button onClick={() => router.push('/dashboard/configuracoes')} className={`group flex items-center w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ease-in-out ${pathname === '/dashboard/configuracoes' ? 'bg-[#1860fa] text-white font-semibold' : 'hover:bg-[#1860fa]/10 hover:text-[#1860fa]'}`}>
                <div className="min-w-[20px]">
                  <FiTool size={20} />
                </div>
                <span className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
                  Configurações
                </span>
              </button>
            </>
          )}
          <button
            onClick={() => {
              auth?.signOut();
              router.push('/login');
            }}
            className="group flex items-center w-full text-left px-3 py-2 text-red-600 hover:text-red-800 mt-4"
          >
            <div className="min-w-[20px]">
              <FiLogOut size={20} />
            </div>
            <span
              className={`ml-2 whitespace-nowrap transition-all duration-300 ease-in-out ${
                expanded ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
              }`}
            >
              Sair
            </span>
          </button>
        </nav>
      </aside>
      <main className="transition-all duration-300 bg-gray-50 p-6 pl-16 z-0 relative overflow-x-auto w-full mt-16">
        {children}
      </main>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: {
            fontSize: '1rem',
            padding: '16px 24px',
            borderRadius: '8px',
          },
        }}
      />
    </div>
  );
}

import { FiSearch, FiBell } from 'react-icons/fi';