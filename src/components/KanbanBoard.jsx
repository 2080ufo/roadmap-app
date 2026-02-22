import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useState } from 'react'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'

const COLUMNS = ['ideas', 'wip', 'done']

export default function KanbanBoard({ tasks, onDeleteTask, onMoveTask, onReorderTasks, onOpenCreateModal }) {
  const [activeTask, setActiveTask] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const tasksByColumn = {
    ideas: tasks.filter(t => t.column_name === 'ideas'),
    wip: tasks.filter(t => t.column_name === 'wip'),
    done: tasks.filter(t => t.column_name === 'done')
  }

  const findColumn = (id) => {
    // Check if id is a column
    if (COLUMNS.includes(id)) return id
    // Find which column contains this task
    for (const col of COLUMNS) {
      if (tasksByColumn[col].some(t => t.id === id)) return col
    }
    return null
  }

  const handleDragStart = (event) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over) return

    const activeCol = findColumn(active.id)
    const overCol = COLUMNS.includes(over.id) ? over.id : findColumn(over.id)

    if (!activeCol || !overCol || activeCol === overCol) return

    // Move task to new column in UI immediately
    onMoveTask(active.id, overCol)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return

    const activeCol = findColumn(active.id)
    const overCol = COLUMNS.includes(over.id) ? over.id : findColumn(over.id)

    if (!activeCol || !overCol) return

    if (activeCol === overCol && active.id !== over.id) {
      const colTasks = tasksByColumn[activeCol]
      const oldIdx = colTasks.findIndex(t => t.id === active.id)
      const newIdx = colTasks.findIndex(t => t.id === over.id)
      if (oldIdx !== -1 && newIdx !== -1) {
        onReorderTasks(activeCol, arrayMove(colTasks, oldIdx, newIdx))
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(col => (
          <KanbanColumn
            key={col}
            columnId={col}
            tasks={tasksByColumn[col]}
            onDeleteTask={onDeleteTask}
            onOpenCreateModal={onOpenCreateModal}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} onDelete={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
