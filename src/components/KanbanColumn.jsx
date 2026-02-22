import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import KanbanCard from './KanbanCard'

const columnStyles = {
  ideas: { accent: 'bg-text-muted', label: 'Ideas' },
  wip: { accent: 'bg-accent-amber', label: 'Work in Progress' },
  done: { accent: 'bg-accent-green', label: 'Done' }
}

export default function KanbanColumn({ columnId, tasks, onAddTask, onDeleteTask }) {
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const { setNodeRef, isOver } = useDroppable({ id: columnId })
  const style = columnStyles[columnId]

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    onAddTask(columnId, newTitle.trim())
    setNewTitle('')
    setAdding(false)
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-surface-800 rounded-xl border transition-colors min-h-[400px] ${
        isOver ? 'border-accent-blue/40 bg-surface-700/50' : 'border-surface-600'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-surface-600">
        <div className={`w-2 h-2 rounded-full ${style.accent}`} />
        <h3 className="text-sm font-medium text-text-primary">{style.label}</h3>
        <span className="text-xs text-text-muted ml-auto">{tasks.length}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <KanbanCard key={task.id} task={task} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
      </div>

      {/* Add task */}
      <div className="p-3 border-t border-surface-600">
        {adding ? (
          <form onSubmit={handleAdd} className="space-y-2">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Task title..."
              className="w-full px-3 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue/50"
              autoFocus
              onBlur={() => { if (!newTitle.trim()) setAdding(false) }}
            />
            <div className="flex gap-2">
              <button type="submit" className="text-xs px-3 py-1.5 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded-lg hover:bg-accent-blue/20 transition-all">Add</button>
              <button type="button" onClick={() => setAdding(false)} className="text-xs text-text-muted hover:text-text-secondary">Cancel</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-left text-sm text-text-muted hover:text-text-secondary transition-colors py-1"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  )
}
