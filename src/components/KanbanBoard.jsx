import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useState } from 'react'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'

const COLUMNS = ['ideas', 'wip', 'done']

export default function KanbanBoard({ tasks, tags, onDeleteTask, onUpdateTask, onMoveTask, onReorderTasks, onOpenCreateModal, onCreateTag, onAddTag, onRemoveTag }) {
  const [activeTask, setActiveTask] = useState(null)
  const [originColumn, setOriginColumn] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const tasksByColumn = {
    ideas: tasks.filter(t => t.column_name === 'ideas'),
    wip: tasks.filter(t => t.column_name === 'wip'),
    done: tasks.filter(t => t.column_name === 'done')
  }

  const findColumn = (id) => {
    if (COLUMNS.includes(id)) return id
    for (const col of COLUMNS) {
      if (tasksByColumn[col].some(t => t.id === id)) return col
    }
    return null
  }

  const handleDragStart = (event) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
    setOriginColumn(task?.column_name || null)
  }

  const handleDragOver = () => {
    // Don't move during drag — only on drop (prevents skipping columns)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    const draggedTask = activeTask
    const startCol = originColumn
    setActiveTask(null)
    setOriginColumn(null)
    if (!over || !draggedTask) return

    const overCol = COLUMNS.includes(over.id) ? over.id : findColumn(over.id)
    if (!overCol) return

    // Cross-column move
    if (startCol !== overCol) {
      onMoveTask(active.id, overCol)
      return
    }

    // Same-column reorder
    if (active.id !== over.id) {
      const colTasks = tasksByColumn[startCol]
      const oldIdx = colTasks.findIndex(t => t.id === active.id)
      const newIdx = colTasks.findIndex(t => t.id === over.id)
      if (oldIdx !== -1 && newIdx !== -1) {
        onReorderTasks(startCol, arrayMove(colTasks, oldIdx, newIdx))
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
            tags={tags}
            onDeleteTask={onDeleteTask}
            onUpdateTask={onUpdateTask}
            onOpenCreateModal={onOpenCreateModal}
            onCreateTag={onCreateTag}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} onDelete={() => {}} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
