'use client'

import { Tab } from '@headlessui/react'
import MenuLayout from '@/components/MenuLayout'
import EmpresaPage from './empresa/page'
import UsuariosPage from './usuarios/page'
import TermosPage from './termos/page'
import StatusPage from './status/page'

export default function ConfiguracoesPage() {
  return (
    <MenuLayout>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Configurações Gerais</h1>

        <Tab.Group>
          <Tab.List className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
            {['Empresa', 'Usuários', 'Termos de Garantia', 'Status'].map((tab) => (
              <Tab
                key={tab}
                className={({ selected }) =>
                  `px-4 py-2 font-semibold rounded-md focus:outline-none ${
                    selected
                      ? 'bg-black text-white shadow'
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                  }`
                }
              >
                {tab}
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels className="mt-6">
            <Tab.Panel><EmpresaPage /></Tab.Panel>
            <Tab.Panel><UsuariosPage /></Tab.Panel>
            <Tab.Panel><TermosPage /></Tab.Panel>
            <Tab.Panel><StatusPage /></Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </MenuLayout>
  )
}