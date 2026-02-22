import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function KanbanCard({ task, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
    disabled: editing
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const age = task.created_at ? new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  const tags = task.tags || []

  const saveEdit = () => {
    if (editTitle.trim() && editTitle.trim() !== task.title) {
      onUpdate(task.id, { title: editTitle.trim() })
    }
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(editing ? {} : listeners)}
      className="bg-surface-700 border border-surface-600 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-text-muted/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditTitle(task.title); setEditing(false) } }}
            className="flex-1 text-sm bg-surface-800 border border-surface-600 rounded px-2 py-1 text-text-primary focus:outline-none focus:border-accent-blue/50"
            autoFocus
          />
        ) : (
          <p className="text-sm text-text-primary leading-snug flex-1">{task.title}</p>
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5">
          {!editing && (
            <button
              onClick={(e) => { e.stopPropagation(); setEditTitle(task.title); setEditing(true) }}
              className="text-text-muted hover:text-accent-blue text-xs"
              title="Edit"
            >
              ✎
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
            className="text-text-muted hover:text-red-400 text-xs"
          >
            ✕
          </button>
        </div>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}
      {age && <p className="text-[11px] text-text-muted mt-1.5">{age}</p>}
    </div>
  )
}
