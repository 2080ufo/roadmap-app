import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import RoadmapTimeline from '../components/RoadmapTimeline'

export default function RoadmapView() {
  const { id } = useParams()
  const [roadmap, setRoadmap] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')

  useEffect(() => { fetchRoadmap() }, [id])

  const fetchRoadmap = async () => {
    try {
      const rm = await api.get(`/api/roadmaps/${id}`)
      if (rm) { setRoadmap(rm); setTitle(rm.title) }
      const ms = await api.get(`/api/milestones?roadmap_id=${id}`)
      setMilestones(ms || [])
    } catch {}
  }

  const updateTitle = async () => {
    if (!title.trim()) return
    await api.put(`/api/roadmaps/${id}`, { title: title.trim() })
    setRoadmap({ ...roadmap, title: title.trim() })
    setEditing(false)
  }

  const addMilestone = async () => {
    const pos = milestones.length
    const data = await api.post('/api/milestones', {
      roadmap_id: id, title: 'New Milestone', position: pos, status: 'planned', color: '#00d4ff'
    })
    if (data) setMilestones([...milestones, data])
  }

  const updateMilestone = async (msId, updates) => {
    await api.put(`/api/milestones/${msId}`, updates)
    setMilestones(milestones.map(m => m.id === msId ? { ...m, ...updates } : m))
  }

  const deleteMilestone = async (msId) => {
    await api.del(`/api/milestones/${msId}`)
    setMilestones(milestones.filter(m => m.id !== msId))
  }

  const reorderMilestones = async (newOrder) => {
    setMilestones(newOrder)
    await api.put('/api/milestones/reorder', {
      milestones: newOrder.map((m, i) => ({ id: m.id, position: i }))
    })
  }

  if (!roadmap) return <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="text-gray-500 hover:text-white transition-colors text-sm">← Back</Link>
        {editing ? (
          <input value={title} onChange={e => setTitle(e.target.value)} onBlur={updateTitle} onKeyDown={e => e.key === 'Enter' && updateTitle()} className="input-field text-xl font-bold py-1 px-2" autoFocus />
        ) : (
          <h1 onClick={() => setEditing(true)} className="text-xl font-bold cursor-pointer hover:text-neon-cyan transition-colors">{roadmap.title}</h1>
        )}
      </div>

      <RoadmapTimeline
        milestones={milestones}
        onAdd={addMilestone}
        onUpdate={updateMilestone}
        onDelete={deleteMilestone}
        onReorder={reorderMilestones}
      />
    </div>
  )
}
