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
  const downloadUrl = `/api/attachments/${att.id}/download?token=${encodeURIComponent(token)}`

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

const TAG_COLORS = ['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#14b8a6','#6366f1']

function KanbanCardInner({ task, tags: allTags = [], onDelete, onUpdate, onCreateTag, onAddTag, onRemoveTag, sortableProps = {} }) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [editDesc, setEditDesc] = useState(task.description || '')
  const [editImportance, setEditImportance] = useState(task.importance || 'normal')
  const [attachments, setAttachments] = useState(task.attachments || [])
  const [showAttachments, setShowAttachments] = useState((task.attachments?.length || 0) > 0)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [tagSearch, setTagSearch] = useState('')
  const fileRef = useRef(null)

  const { attributes = {}, listeners = {}, setNodeRef, transform, transition, isDragging } = sortableProps

  const style = {
    transform: CSS.Transform.toString(transform || null),
    transition: transition || undefined,
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
    if (editImportance !== (task.importance || 'normal')) updates.importance = editImportance
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
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-muted">Priority:</span>
            {[
              { value: 'critical', label: '🔴', color: 'rgb(239 68 68)', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
              { value: 'normal', label: '🟡', color: 'rgb(245 158 11)', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
              { value: 'low', label: '🟢', color: 'rgb(34 197 94)', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setEditImportance(opt.value)}
                className="px-1.5 py-0.5 rounded-full text-[10px] transition-all"
                style={{
                  backgroundColor: editImportance === opt.value ? opt.bg : 'transparent',
                  border: `1px solid ${editImportance === opt.value ? opt.border : 'var(--surface-600, #374151)'}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={saveEdit} className="text-xs px-2 py-1 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded hover:bg-accent-blue/20 transition-all">Save</button>
            <button onClick={() => { setEditTitle(task.title); setEditDesc(task.description || ''); setEditImportance(task.importance || 'normal'); setEditing(false) }} className="text-xs text-text-muted hover:text-text-secondary">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {task.importance === 'critical' && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500" title="Critical" />}
              {task.importance === 'low' && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500/50" title="Low priority" />}
              <p className="text-sm text-text-primary leading-snug">{task.title}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5">
              <button
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
                className="text-text-muted hover:text-accent-blue text-xs"
                title="Attach file"
              >
                📎
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEditTitle(task.title); setEditDesc(task.description || ''); setEditImportance(task.importance || 'normal'); setEditing(true) }}
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
      <div className="flex flex-wrap gap-1 mt-2 items-center">
        {tags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium group/tag"
            style={{ backgroundColor: tag.color + '20', color: tag.color }}
          >
            {tag.name}
            {onRemoveTag && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemoveTag(task.id, tag.id) }}
                className="opacity-0 group-hover/tag:opacity-100 hover:opacity-100 ml-0.5 transition-opacity"
              >✕</button>
            )}
          </span>
        ))}
        {onAddTag && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowTagPicker(!showTagPicker); setTagSearch('') }}
              className="text-text-muted hover:text-text-secondary text-[10px] px-1.5 py-0.5 rounded-full border border-dashed border-surface-500 hover:border-text-muted/40 transition-all opacity-0 group-hover:opacity-100"
            >
              + tag
            </button>
            {showTagPicker && (
              <div className="absolute left-0 top-full mt-1 bg-surface-700 border border-surface-600 rounded-lg shadow-lg z-50 w-44 overflow-hidden" onClick={e => e.stopPropagation()}>
                <input
                  value={tagSearch}
                  onChange={e => setTagSearch(e.target.value)}
                  placeholder="Search or create..."
                  className="w-full px-2 py-1.5 bg-surface-800 text-xs text-text-primary placeholder-text-muted focus:outline-none border-b border-surface-600"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Escape') setShowTagPicker(false)
                    if (e.key === 'Enter' && tagSearch.trim()) {
                      e.preventDefault()
                      const existing = allTags.find(t => t.name.toLowerCase() === tagSearch.toLowerCase())
                      if (existing && !tags.find(t => t.id === existing.id)) {
                        onAddTag(task.id, existing.id)
                      } else if (!existing && onCreateTag) {
                        onCreateTag(tagSearch.trim(), TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]).then(tag => {
                          if (tag) onAddTag(task.id, tag.id)
                        })
                      }
                      setShowTagPicker(false)
                      setTagSearch('')
                    }
                  }}
                />
                <div className="max-h-32 overflow-y-auto">
                  {allTags
                    .filter(t => !tags.find(tg => tg.id === t.id) && t.name.includes(tagSearch.toLowerCase()))
                    .map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => { onAddTag(task.id, tag.id); setShowTagPicker(false) }}
                        className="w-full text-left px-2 py-1.5 hover:bg-surface-600 text-xs flex items-center gap-2 transition-colors"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                        <span className="text-text-secondary">{tag.name}</span>
                      </button>
                    ))
                  }
                  {tagSearch && !allTags.find(t => t.name === tagSearch.toLowerCase()) && (
                    <button
                      onClick={async () => {
                        if (onCreateTag) {
                          const tag = await onCreateTag(tagSearch.trim(), TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)])
                          if (tag) onAddTag(task.id, tag.id)
                        }
                        setShowTagPicker(false)
                        setTagSearch('')
                      }}
                      className="w-full text-left px-2 py-1.5 hover:bg-surface-600 text-xs flex items-center gap-2 border-t border-surface-600 transition-colors"
                    >
                      <span className="text-accent-blue">+</span>
                      <span className="text-text-muted">Create "{tagSearch}"</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
        <div
          className="mt-2 space-y-1"
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }}
          onDragLeave={(e) => { e.stopPropagation(); setDragOver(false) }}
          onDrop={(e) => { e.stopPropagation(); handleDrop(e) }}
        >
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

// Sortable wrapper — uses the hook, passes props down
function SortableKanbanCard({ task, ...props }) {
  const sortableProps = useSortable({
    id: task.id,
    data: { type: 'task', task },
  })
  return <KanbanCardInner task={task} {...props} sortableProps={sortableProps} />
}

// Exported component — isDragOverlay skips sortable hook
export default function KanbanCard({ isDragOverlay, ...props }) {
  if (isDragOverlay) {
    return <KanbanCardInner {...props} />
  }
  return <SortableKanbanCard {...props} />
}
