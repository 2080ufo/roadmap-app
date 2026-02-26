import { DndContext, closestCenter, pointerWithin, rectIntersection, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useState, useCallback } from 'react'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'

const COLUMNS = ['ideas', 'wip', 'done']

// Custom collision detection: prefer droppable columns, then closest center
function customCollision(args) {
  // First check pointer-within (most intuitive for cross-column)
  const pointerCollisions = pointerWithin(args)
  
  // If pointer is within a column droppable, use that
  const columnHit = pointerCollisions.find(c => COLUMNS.includes(c.id))
  if (columnHit) return [columnHit]
  
  // If pointer is within a card, find which column it belongs to
  if (pointerCollisions.length > 0) return pointerCollisions
  
  // Fallback to rect intersection
  const rectCollisions = rectIntersection(args)
  if (rectCollisions.length > 0) return rectCollisions
  
  // Last resort: closest center
  return closestCenter(args)
}

export default function KanbanBoard({ tasks, tags, onDeleteTask, onUpdateTask, onMoveTask, onReorderTasks, onOpenCreateModal, onCreateTag, onAddTag, onRemoveTag }) {
  const [activeTask, setActiveTask] = useState(null)
  const [originColumn, setOriginColumn] = useState(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const tasksByColumn = {
    ideas: tasks.filter(t => t.column_name === 'ideas'),
    wip: tasks.filter(t => t.column_name === 'wip'),
    done: tasks.filter(t => t.column_name === 'done')
  }

  const findColumn = useCallback((id) => {
    if (COLUMNS.includes(id)) return id
    for (const col of COLUMNS) {
      if (tasksByColumn[col].some(t => t.id === id)) return col
    }
    return null
  }, [tasksByColumn])

  const handleDragStart = (event) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
    setOriginColumn(task?.column_name || null)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    const draggedTask = activeTask
    const startCol = originColumn
    setActiveTask(null)
    setOriginColumn(null)
    if (!over || !draggedTask) return

    const overCol = findColumn(over.id)
    if (!overCol) return

    // Cross-column move
    if (startCol !== overCol) {
      onMoveTask(active.id, overCol)
      return
    }

    // Same-column reorder
    if (active.id !== over.id && !COLUMNS.includes(over.id)) {
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
      collisionDetection={customCollision}
      onDragStart={handleDragStart}
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
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div style={{ opacity: 0.85, transform: 'rotate(2deg)', cursor: 'grabbing' }}>
            <KanbanCard task={activeTask} isDragOverlay onDelete={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
