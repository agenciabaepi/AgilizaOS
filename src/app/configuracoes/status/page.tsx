

'use client'

import MenuLayout from '@/components/MenuLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function StatusPage() {
  return (
    <MenuLayout>
      <div className="max-w-5xl mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Status da OS e Técnicos</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-6 shadow-sm bg-white">
              <h2 className="text-lg font-semibold mb-3">Status da Ordem de Serviço</h2>
              <ul className="list-disc list-inside text-sm text-muted-foreground mb-4 space-y-1">
                <li>Orçamento</li>
                <li>Aguardando aprovação</li>
                <li>Em execução</li>
                <li>Finalizado</li>
                <li>Entregue</li>
              </ul>
              <button className="w-full py-2 px-4 bg-black text-white rounded hover:bg-zinc-800 text-sm">
                + Adicionar status personalizado
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                Os status fixos não podem ser removidos.
              </p>
            </div>

            <div className="border rounded-lg p-6 shadow-sm bg-white">
              <h2 className="text-lg font-semibold mb-3">Status do Técnico</h2>
              <ul className="list-disc list-inside text-sm text-muted-foreground mb-4 space-y-1">
                <li>Recebido</li>
                <li>Em andamento</li>
                <li>Concluído</li>
              </ul>
              <button className="w-full py-2 px-4 bg-black text-white rounded hover:bg-zinc-800 text-sm">
                + Adicionar status personalizado
              </button>
              <p className="text-xs text-muted-foreground mt-2">
                Os status fixos não podem ser removidos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MenuLayout>
  )
}