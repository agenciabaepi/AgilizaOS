'use client'

import { Suspense, useEffect, useState, lazy } from 'react'
import MenuLayout from '@/components/MenuLayout'
import { Tab } from '@headlessui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import ProtectedArea from '@/components/ProtectedArea';


// Lazy loading das páginas para melhor performance
const EmpresaPage = lazy(() => import('./empresa/page'))
const UsuariosPage = lazy(() => import('./usuarios/page'))
const TermosPage = lazy(() => import('./termos/page'))
const StatusPage = lazy(() => import('./status/page'))
// Remover importação de PerfilPage

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
  const [tabIndex, setTabIndex] = useState(0)
  const [userLevel, setUserLevel] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserLevel = async () => {
      console.log('fetchUserLevel chamado:', { authLoading, user: !!user, usuarioData: !!usuarioData })
      
      // Aguarda o contexto de autenticação carregar
      if (authLoading) {
        console.log('Aguardando carregamento da autenticação...')
        return
      }

      if (!user) {
        console.log('Usuário não autenticado')
        setLoading(false)
        return
      }

      // Se já temos dados do contexto, usa imediatamente
      if (usuarioData?.nivel) {
        console.log('Usando nível do contexto:', usuarioData.nivel)
        setUserLevel(usuarioData.nivel)
        setLoading(false)
        return
      }

      // Se não temos dados do contexto, usa fallback imediato
      console.log('Usando fallback para nível padrão')
      setUserLevel('atendente')
      setLoading(false)
    }

    fetchUserLevel()
  }, [user, authLoading, usuarioData])

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

  // Se o usuário não está autenticado, não mostra nada
  if (!user && !authLoading) {
    console.log('Usuário não autenticado, retornando null')
    return null;
  }

  // Se ainda está carregando a autenticação, mostra loading
  if (authLoading) {
    console.log('Ainda carregando autenticação, mostrando loading')
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

  // Se ainda está carregando o nível do usuário
  if (loading) {
    console.log('Ainda carregando nível do usuário, mostrando loading')
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

  console.log('Renderizando página de configurações:', { userLevel, user: !!user })

  // Para outros níveis, mostra todas as abas
  console.log('Usuário não é atendente, mostrando todas as abas')
  const tabs = [
    { name: 'Empresa', component: <EmpresaPage /> },
    { name: 'Usuários', component: <UsuariosPage /> },
    { name: 'Termos de Garantia', component: <TermosPage /> },
    { name: 'Status', component: <StatusPage /> },
  ]

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
    <ProtectedArea area="configuracoes">
      <Suspense fallback={<div className="p-8">Carregando configurações...</div>}>
        <ConfiguracoesInner />
      </Suspense>
    </ProtectedArea>
  )
}

export const dynamic = 'force-dynamic'