'use client'

import MenuLayout from '@/components/MenuLayout'
import { DndContext, closestCenter } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useState } from 'react'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'

const SortableItem = ({ id }: { id: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border px-4 py-3 rounded shadow-sm cursor-move mb-2"
    >
      {id}
    </div>
  )
}

const termosIniciais = ['Padrão 90 dias', 'Extendido 6 meses', 'Sem garantia']

export default function TermosPage() {
  const [termos, setTermos] = useState(termosIniciais)

  function handleDragEnd(event: any) {
    const { active, over } = event
    if (!over) return

    console.log('Ativo:', active.id)
    console.log('Sobre:', over.id)

    if (active.id !== over.id) {
      setTermos((items) => {
        const oldIndex = items.indexOf(active.id)
        const newIndex = items.indexOf(over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  return (
    <MenuLayout>
      <div className="px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-800">Termos de Garantia</h1>
        <p className="mt-2 text-gray-600">Arraste para organizar a ordem de exibição dos termos:</p>
        <div className="mt-6 max-w-xl">
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            // modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext items={termos} strategy={verticalListSortingStrategy}>
              {termos.map((termo) => (
                <SortableItem key={termo} id={termo} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </MenuLayout>
  )
}