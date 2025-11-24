'use client'

import { Suspense, useEffect, useState, lazy } from 'react'
import dynamic from 'next/dynamic'
import MenuLayout from '@/components/MenuLayout'
import { Tab } from '@headlessui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
// Removido ProtectedArea - agora é responsabilidade do MenuLayout
import { ToastProvider } from '@/components/Toast'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import { useSubscription } from '@/hooks/useSubscription'

// Dynamic import com SSR desabilitado para a página de empresa
const EmpresaPage = dynamic(() => import('./empresa/page'), { ssr: false })
// Lazy loading das outras páginas para melhor performance
const UsuariosPage = lazy(() => import('./usuarios/page'))
const TermosPage = lazy(() => import('./termos/page'))
const StatusPage = lazy(() => import('./status/page'))
const ComissoesPage = lazy(() => import('./comissoes/page'))
const CatalogoPage = lazy(() => import('./catalogo/page'))
const WhatsAppPage = lazy(() => import('./whatsapp/page'))
const EquipamentosPage = lazy(() => import('./equipamentos/page'))
const ChecklistNovoPage = lazy(() => import('./checklist-novo/page'))
const AvisosPage = lazy(() => import('./avisos/page'))

// Componente de loading para as páginas filhas
const PageLoader = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
  </div>
)

function ConfiguracoesInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, usuarioData } = useAuth()
  const { temRecurso } = useSubscription()
  const [tabIndex, setTabIndex] = useState(0)

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) setTabIndex(Number(tab))
  }, [searchParams])

  const handleTabChange = (index: number) => {
    setTabIndex(index)
    const params = new URLSearchParams(searchParams)
    params.set('tab', index.toString())
    router.replace(`?${params.toString()}`)
  }

  const chave = searchParams.get('chave')
  if (chave) {
    return (
      <div className="p-10">
        <h1 className="text-xl font-bold">Chave recebida: {chave}</h1>
      </div>
    )
  }

  // Se ainda está carregando a autenticação ou dados do usuário, mostra loading
  if (authLoading || !usuarioData) {
    return (
      <MenuLayout>
        <div className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </MenuLayout>
    )
  }

  // ✅ CORRIGIDO: Verificar permissões específicas do usuário
  const isAdmin = usuarioData.nivel === 'admin';
  const isUsuarioTeste = usuarioData.nivel === 'usuarioteste';
  const permissoes = usuarioData.permissoes || [];
  
  // Função para verificar se o usuário tem permissão para uma configuração específica
  const podeAcessar = (configPermissao: string) => {
    if (isAdmin || isUsuarioTeste) return true;
    return permissoes.includes(configPermissao);
  };
  
  // Construir abas baseado nas permissões do usuário e recursos do plano
  const tabsConfig = [
    { name: 'Empresa', component: <EmpresaPage />, permissao: 'empresa', requerRecurso: null },
    { name: 'Usuários', component: <UsuariosPage />, permissao: 'usuarios', requerRecurso: null },
    { name: 'Comissões', component: <ComissoesPage />, permissao: 'comissoes', requerRecurso: 'financeiro' },
    { name: 'Equipamentos', component: <EquipamentosPage />, permissao: 'equipamentos', requerRecurso: null },
    { name: 'Checklist', component: <ChecklistNovoPage />, permissao: 'checklist', requerRecurso: null },
    { name: 'Termos de Garantia', component: <TermosPage />, permissao: 'termos', requerRecurso: null },
    { name: 'Status', component: <StatusPage />, permissao: 'status', requerRecurso: null },
    { name: 'Catálogo', component: <CatalogoPage />, permissao: 'catalogo', requerRecurso: null },
    { name: 'WhatsApp', component: <WhatsAppPage />, permissao: 'whatsapp', requerRecurso: 'whatsapp' },
    { name: 'Avisos', component: <AvisosPage />, permissao: 'configuracoes', requerRecurso: null },
  ];
  
  // Filtrar abas baseado nas permissões do usuário e recursos do plano
  const tabs = tabsConfig
    .filter(tab => {
      // Verificar permissão do usuário
      if (!podeAcessar(tab.permissao)) return false;
      // Verificar recurso do plano (se necessário)
      if (tab.requerRecurso && !temRecurso(tab.requerRecurso)) return false;
      return true;
    })
    .map(tab => ({ name: tab.name, component: tab.component }));

  return (
    <MenuLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Configurações Gerais</h1>

        <Tab.Group selectedIndex={tabIndex} onChange={handleTabChange}>
          <Tab.List className="flex space-x-2 bg-gray-100 p-1 rounded-lg overflow-x-auto">
            {tabs.map((tab) => (
              <Tab
                key={tab.name}
                className={({ selected }) =>
                  `px-4 py-2 font-semibold rounded-md focus:outline-none whitespace-nowrap ${
                    selected
                      ? 'bg-black text-white shadow'
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }`
                }
              >
                {tab.name}
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels className="mt-6">
            {tabs.map((tab) => (
              <Tab.Panel key={tab.name}>
                <Suspense fallback={<PageLoader />}>
                  {tab.component}
                </Suspense>
              </Tab.Panel>
            ))}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </MenuLayout>
  )
}

export default function ConfiguracoesPage() {
  return (
    
      <ToastProvider>
        <ConfirmProvider>
          <Suspense fallback={<div className="p-8">Carregando configurações...</div>}>
            <ConfiguracoesInner />
          </Suspense>
        </ConfirmProvider>
      </ToastProvider>
    
  )
}