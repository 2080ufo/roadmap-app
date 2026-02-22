import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const statuses = ['planned', 'in_progress', 'done']
const statusLabels = { planned: 'Planned', in_progress: 'In Progress', done: 'Done' }

export default function MilestoneNode({ milestone, onUpdate, onDelete, statusColors }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(milestone.title)
  const [desc, setDesc] = useState(milestone.description || '')

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: milestone.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const colors = statusColors[milestone.status]

  const cycleStatus = () => {
    const idx = statuses.indexOf(milestone.status)
    const next = statuses[(idx + 1) % statuses.length]
    onUpdate(milestone.id, { status: next })
  }

  const saveEdit = () => {
    onUpdate(milestone.id, { title: title.trim() || milestone.title, description: desc.trim() || null })
    setEditing(false)
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex flex-col items-center w-36 group">
      {/* Node */}
      <div {...listeners} className="cursor-grab active:cursor-grabbing">
        <button
          onClick={cycleStatus}
          className={`w-12 h-12 rounded-full ${colors.bg} ring-4 ${colors.ring}/20 transition-all hover:scale-110 flex items-center justify-center`}
          style={{ boxShadow: `0 0 16px ${statusColors[milestone.status].line}33` }}
          title={`Status: ${statusLabels[milestone.status]} (click to change)`}
        >
          {milestone.status === 'done' && <span className="text-dark-900 text-lg">✓</span>}
          {milestone.status === 'in_progress' && <span className="text-dark-900 text-xs font-bold">●</span>}
        </button>
      </div>

      {/* Label */}
      {editing ? (
        <div className="mt-3 space-y-1.5 w-full">
          <input value={title} onChange={e => setTitle(e.target.value)} className="input-field text-xs py-1 px-2 text-center" autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit()} />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description..." className="input-field text-xs py-1 px-2 resize-none" rows={2} />
          <div className="flex gap-1">
            <button onClick={saveEdit} className="btn-primary text-[10px] py-0.5 px-2 flex-1">Save</button>
            <button onClick={() => setEditing(false)} className="text-[10px] text-gray-500 px-2">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-center cursor-pointer" onClick={() => setEditing(true)}>
          <p className="text-sm font-medium leading-tight">{milestone.title}</p>
          {milestone.description && <p className="text-xs text-gray-500 mt-0.5 leading-tight">{milestone.description}</p>}
          <span className="text-[10px] text-gray-600 mt-1 block">{statusLabels[milestone.status]}</span>
        </div>
      )}

      {/* Delete */}
      <button onClick={() => onDelete(milestone.id)} className="mt-2 text-[10px] text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">Delete</button>
    </div>
  )
}
