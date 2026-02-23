import { useState, useEffect, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import api from '../lib/api'

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function AttachmentItem({ att, onDelete }) {
  const isImage = att.mime_type?.startsWith('image/')
  const token = localStorage.getItem('token')
  const downloadUrl = `/api/attachments/${att.id}/download`

  return (
    <div className="flex items-center gap-2 group/att bg-surface-800 rounded px-2 py-1.5 text-xs">
      {isImage ? (
        <a href={downloadUrl} target="_blank" rel="noreferrer" className="flex-shrink-0">
          <img
            src={downloadUrl}
            alt={att.original_name}
            className="w-8 h-8 rounded object-cover border border-surface-600"
            onError={e => e.target.style.display = 'none'}
          />
        </a>
      ) : (
        <span className="text-base flex-shrink-0">📎</span>
      )}
      <a
        href={downloadUrl}
        target="_blank"
        rel="noreferrer"
        className="text-text-secondary hover:text-accent-blue truncate flex-1 transition-colors"
        title={att.original_name}
      >
        {att.original_name}
      </a>
      <span className="text-text-muted flex-shrink-0">{formatSize(att.size)}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(att.id) }}
        className="text-text-muted hover:text-red-400 opacity-0 group-hover/att:opacity-100 transition-all flex-shrink-0"
      >
        ✕
      </button>
    </div>
  )
}

export default function KanbanCard({ task, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description || '')
  const [attachments, setAttachments] = useState([])
  const [showAttachments, setShowAttachments] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

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

  const loadAttachments = async () => {
    try {
      const data = await api.get(`/api/tasks/${task.id}/attachments`)
      setAttachments(data)
    } catch {}
  }

  useEffect(() => {
    if (showAttachments && attachments.length === 0) loadAttachments()
  }, [showAttachments])

  const handleUpload = async (files) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const newAtts = await api.upload(`/api/tasks/${task.id}/attachments`, Array.from(files))
      setAttachments(prev => [...prev, ...newAtts])
      setShowAttachments(true)
    } catch (e) {
      alert(e.message)
    }
    setUploading(false)
  }

  const handleDeleteAttachment = async (attId) => {
    try {
      await api.del(`/api/attachments/${attId}`)
      setAttachments(prev => prev.filter(a => a.id !== attId))
    } catch {}
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    handleUpload(e.dataTransfer.files)
  }

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
      className={`bg-surface-700 border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-text-muted/30 transition-all group ${
        dragOver ? 'border-accent-blue border-dashed' : 'border-surface-600'
      }`}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
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
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
                className="text-text-muted hover:text-accent-blue text-xs"
                title="Attach file"
              >
                📎
              </button>
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

      {/* Tags */}
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

      {/* Attachment count badge + toggle */}
      {(attachments.length > 0 || showAttachments) && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowAttachments(!showAttachments) }}
          className="flex items-center gap-1 mt-2 text-[11px] text-text-muted hover:text-text-secondary transition-colors"
        >
          📎 {attachments.length} file{attachments.length !== 1 ? 's' : ''} {showAttachments ? '▾' : '▸'}
        </button>
      )}

      {/* Attachment list */}
      {showAttachments && (
        <div className="mt-2 space-y-1">
          {attachments.map(att => (
            <AttachmentItem key={att.id} att={att} onDelete={handleDeleteAttachment} />
          ))}
          {uploading && <p className="text-[11px] text-accent-blue animate-pulse">Uploading...</p>}
          {dragOver && <p className="text-[11px] text-accent-blue text-center py-2">Drop files here</p>}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md,.csv,.json"
        className="hidden"
        onChange={e => { handleUpload(e.target.files); e.target.value = '' }}
      />

      {!editing && age && <p className="text-[11px] text-text-muted mt-1.5">{age}</p>}
    </div>
  )
}
