import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function KanbanCard({ task, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description || '')

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
    const updates = {}
    if (editTitle.trim() && editTitle.trim() !== task.title) updates.title = editTitle.trim()
    if (editDesc.trim() !== (task.description || '')) updates.description = editDesc.trim() || null
    if (Object.keys(updates).length) onUpdate(task.id, updates)
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
      {editing ? (
        <div className="space-y-2">
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setEditTitle(task.title); setEditDesc(task.description || ''); setEditing(false) } }}
            className="w-full text-sm bg-surface-800 border border-surface-600 rounded px-2 py-1 text-text-primary focus:outline-none focus:border-accent-blue/50"
            placeholder="Title"
            autoFocus
          />
          <textarea
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            className="w-full text-xs bg-surface-800 border border-surface-600 rounded px-2 py-1.5 text-text-secondary focus:outline-none focus:border-accent-blue/50 resize-none"
            placeholder="Description (optional)"
            rows={3}
          />
          <div className="flex gap-2">
            <button onClick={saveEdit} className="text-xs px-2 py-1 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded hover:bg-accent-blue/20 transition-all">Save</button>
            <button onClick={() => { setEditTitle(task.title); setEditDesc(task.description || ''); setEditing(false) }} className="text-xs text-text-muted hover:text-text-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-text-primary leading-snug flex-1">{task.title}</p>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); setEditTitle(task.title); setEditDesc(task.description || ''); setEditing(true) }}
                className="text-text-muted hover:text-accent-blue text-xs"
                title="Edit"
              >
                ✎
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(task.id) }}
                className="text-text-muted hover:text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
          {task.description && (
            <p className="text-xs text-text-muted mt-1.5 leading-relaxed line-clamp-3">{task.description}</p>
          )}
        </>
      )}
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
      {!editing && age && <p className="text-[11px] text-text-muted mt-1.5">{age}</p>}
    </div>
  )
}
