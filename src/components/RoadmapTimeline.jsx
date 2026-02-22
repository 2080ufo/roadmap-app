import { useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import MilestoneNode from './MilestoneNode'

const statusColors = {
  planned: { bg: 'bg-gray-600', ring: 'ring-gray-500', line: '#555' },
  in_progress: { bg: 'bg-neon-cyan', ring: 'ring-neon-cyan', line: '#00d4ff' },
  done: { bg: 'bg-neon-green', ring: 'ring-neon-green', line: '#00ff88' }
}

export default function RoadmapTimeline({ milestones, onAdd, onUpdate, onDelete, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIdx = milestones.findIndex(m => m.id === active.id)
      const newIdx = milestones.findIndex(m => m.id === over.id)
      onReorder(arrayMove(milestones, oldIdx, newIdx))
    }
  }

  return (
    <div className="card p-6 overflow-x-auto">
      {milestones.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-0.5 bg-dark-600 mx-auto mb-6 relative">
            <div className="absolute -left-1 -top-1 w-3 h-3 rounded-full bg-dark-600 border-2 border-dark-600" />
            <div className="absolute -right-1 -top-1 w-3 h-3 rounded-full border-2 border-dashed border-gray-500" />
          </div>
          <p className="text-gray-500 text-sm mb-3">Start building your roadmap</p>
          <button onClick={onAdd} className="btn-primary text-sm">+ Add first milestone</button>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-0 min-w-max pb-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={milestones.map(m => m.id)} strategy={horizontalListSortingStrategy}>
                {milestones.map((ms, i) => (
                  <div key={ms.id} className="flex items-start">
                    <MilestoneNode
                      milestone={ms}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                      statusColors={statusColors}
                    />
                    {i < milestones.length - 1 && (
                      <div className="flex items-center pt-6 mx-0">
                        <div className="w-16 h-0.5 rounded-full" style={{ background: `linear-gradient(90deg, ${statusColors[ms.status].line}, ${statusColors[milestones[i+1].status].line})` }} />
                      </div>
                    )}
                  </div>
                ))}
              </SortableContext>
            </DndContext>
            <div className="flex items-center pt-6 ml-2">
              <div className="w-8 h-0.5 bg-dark-600" />
              <button onClick={onAdd} className="w-8 h-8 rounded-full border-2 border-dashed border-gray-600 hover:border-neon-cyan text-gray-600 hover:text-neon-cyan transition-all flex items-center justify-center text-sm flex-shrink-0">+</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
