import { useState, useRef, useEffect } from 'react'

const TAG_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
]

const FILE_ICONS = {
  'image': '🖼️',
  'application/pdf': '📄',
  'text': '📝',
  'default': '📎'
}

const getFileIcon = (mimeType) => {
  if (mimeType.startsWith('image/')) return FILE_ICONS['image']
  if (mimeType === 'application/pdf') return FILE_ICONS['application/pdf']
  if (mimeType.startsWith('text/')) return FILE_ICONS['text']
  return FILE_ICONS['default']
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function CreateTaskModal({ isOpen, columnId, tags, onClose, onSubmit, onCreateTag }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [tagSearch, setTagSearch] = useState('')
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)
  const tagInputRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setSelectedTags([])
      setTagSearch('')
      setFiles([])
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleFileSelect = (e) => {
    const newFiles = Array.from(e.target.files || [])
    const validFiles = newFiles.filter(f => {
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json']
      return allowed.includes(f.type) || f.type.startsWith('image/')
    })
    if (validFiles.length + files.length > 5) {
      alert('Maximum 5 files allowed')
      return
    }
    setFiles([...files, ...validFiles])
    e.target.value = '' // Reset input
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files)
    const validFiles = droppedFiles.filter(f => {
      const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json']
      return allowed.includes(f.type) || f.type.startsWith('image/')
    })
    if (validFiles.length + files.length > 5) {
      alert('Maximum 5 files allowed')
      return
    }
    setFiles([...files, ...validFiles])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  if (!isOpen) return null

  const filteredTags = tags.filter(t =>
    t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
    !selectedTags.find(s => s.id === t.id)
  )

  const handleTitleChange = (e) => {
    const val = e.target.value
    setTitle(val)

    // Detect hashtag typing
    const hashMatch = val.match(/#(\w*)$/)
    if (hashMatch) {
      setTagSearch(hashMatch[1])
      setShowTagDropdown(true)
    } else {
      setShowTagDropdown(false)
    }
  }

  const selectTag = (tag) => {
    setSelectedTags([...selectedTags, tag])
    // Remove #word from title
    setTitle(title.replace(/#\w*$/, '').trim())
    setShowTagDropdown(false)
    setTagSearch('')
    inputRef.current?.focus()
  }

  const removeTag = (tagId) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId))
  }

  const createAndSelectTag = async () => {
    if (!tagSearch.trim()) return
    const tag = await onCreateTag(tagSearch.trim(), newTagColor)
    if (tag) {
      selectTag(tag)
      setNewTagColor(TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setUploading(true)
    try {
      await onSubmit(columnId, title.trim(), description.trim(), selectedTags.map(t => t.id), files)
      onClose()
    } catch (err) {
      console.error('Failed to create task:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose()
    if (showTagDropdown && e.key === 'Enter' && tagSearch) {
      e.preventDefault()
      if (filteredTags.length > 0) {
        selectTag(filteredTags[0])
      } else {
        createAndSelectTag()
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-surface-800 border border-surface-600 rounded-xl shadow-2xl p-5"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          {/* Title input */}
          <div className="relative">
            <input
              ref={inputRef}
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              placeholder="Task title... (type # for tags)"
              className="w-full px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue/50 text-sm"
            />

            {/* Tag autocomplete dropdown */}
            {showTagDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-surface-700 border border-surface-600 rounded-lg shadow-lg overflow-hidden z-10 max-h-48 overflow-y-auto">
                {filteredTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => selectTag(tag)}
                    className="w-full text-left px-3 py-2 hover:bg-surface-600 transition-colors flex items-center gap-2 text-sm"
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="text-text-primary">{tag.name}</span>
                  </button>
                ))}
                {tagSearch && !filteredTags.find(t => t.name === tagSearch.toLowerCase()) && (
                  <button
                    type="button"
                    onClick={createAndSelectTag}
                    className="w-full text-left px-3 py-2 hover:bg-surface-600 transition-colors flex items-center gap-2 text-sm border-t border-surface-600"
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: newTagColor }} />
                    <span className="text-text-secondary">Create "<span className="text-text-primary">{tagSearch}</span>"</span>
                    {/* Color picker dots */}
                    <div className="ml-auto flex gap-1">
                      {TAG_COLORS.slice(0, 5).map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setNewTagColor(c) }}
                          className={`w-3 h-3 rounded-full transition-transform ${newTagColor === c ? 'scale-125 ring-1 ring-white' : 'opacity-60 hover:opacity-100'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </button>
                )}
                {filteredTags.length === 0 && !tagSearch && (
                  <p className="px-3 py-2 text-xs text-text-muted">No tags yet. Type a name to create one.</p>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={4}
            className="w-full mt-3 px-4 py-3 bg-surface-700 border border-surface-600 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-blue/50 text-sm resize-none"
          />

          {/* File attachments */}
          <div
            className="mt-3 border-2 border-dashed border-surface-600 rounded-lg p-4 hover:border-accent-blue/40 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.md,.csv,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="text-center">
              <span className="text-2xl">📎</span>
              <p className="text-xs text-text-muted mt-1">
                Drop files here or click to upload
              </p>
              <p className="text-[10px] text-text-muted/60 mt-0.5">
                Images, PDF, TXT, MD, CSV, JSON • Max 5 files • 10MB each
              </p>
            </div>
          </div>

          {/* Uploaded files preview */}
          {files.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2 py-1.5 bg-surface-700 rounded-lg text-xs"
                >
                  <span>{getFileIcon(file.type)}</span>
                  <span className="flex-1 truncate text-text-secondary">{file.name}</span>
                  <span className="text-text-muted text-[10px]">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(idx) }}
                    className="text-text-muted hover:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Selected tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedTags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: tag.color + '20', color: tag.color, border: `1px solid ${tag.color}40` }}
                >
                  {tag.name}
                  <button type="button" onClick={() => removeTag(tag.id)} className="hover:opacity-70">✕</button>
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => setShowTagDropdown(!showTagDropdown)}
              className="text-xs text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1"
            >
              <span className="text-base">#</span> Add tags
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || uploading}
                className="px-4 py-1.5 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue rounded-lg text-sm hover:bg-accent-blue/20 transition-all disabled:opacity-30"
              >
                {uploading ? 'Creating...' : (files.length > 0 ? `Add task + ${files.length} file${files.length > 1 ? 's' : ''}` : 'Add task')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
