import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import RoadmapTimeline from '../components/RoadmapTimeline'

export default function RoadmapView() {
  const { id } = useParams()
  const [roadmap, setRoadmap] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')

  useEffect(() => { fetchRoadmap() }, [id])

  const fetchRoadmap = async () => {
    const { data: rm } = await supabase.from('roadmaps').select('*').eq('id', id).single()
    if (rm) { setRoadmap(rm); setTitle(rm.title) }
    const { data: ms } = await supabase.from('milestones').select('*').eq('roadmap_id', id).order('position')
    setMilestones(ms || [])
  }

  const updateTitle = async () => {
    if (!title.trim()) return
    await supabase.from('roadmaps').update({ title: title.trim() }).eq('id', id)
    setRoadmap({ ...roadmap, title: title.trim() })
    setEditing(false)
  }

  const addMilestone = async () => {
    const pos = milestones.length
    const { data } = await supabase.from('milestones')
      .insert({ roadmap_id: id, title: 'New Milestone', position: pos, status: 'planned', color: '#00d4ff' })
      .select().single()
    if (data) setMilestones([...milestones, data])
  }

  const updateMilestone = async (msId, updates) => {
    await supabase.from('milestones').update(updates).eq('id', msId)
    setMilestones(milestones.map(m => m.id === msId ? { ...m, ...updates } : m))
  }

  const deleteMilestone = async (msId) => {
    await supabase.from('milestones').delete().eq('id', msId)
    setMilestones(milestones.filter(m => m.id !== msId))
  }

  const reorderMilestones = async (newOrder) => {
    setMilestones(newOrder)
    for (let i = 0; i < newOrder.length; i++) {
      await supabase.from('milestones').update({ position: i }).eq('id', newOrder[i].id)
    }
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
