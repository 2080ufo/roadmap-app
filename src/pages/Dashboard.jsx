import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import TodoList from '../components/TodoList'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [roadmaps, setRoadmaps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchRoadmaps() }, [])

  const fetchRoadmaps = async () => {
    try {
      const data = await api.get('/api/roadmaps')
      setRoadmaps(data || [])
    } catch { setRoadmaps([]) }
    setLoading(false)
  }

  const createRoadmap = async () => {
    try {
      const data = await api.post('/api/roadmaps', { title: 'New Roadmap' })
      if (data?.id) navigate(`/roadmap/${data.id}`)
    } catch (e) { alert('Error: ' + e.message) }
  }

  const deleteRoadmap = async (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this roadmap?')) return
    await api.del(`/api/roadmaps/${id}`)
    setRoadmaps(r => r.filter(x => x.id !== id))
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Roadmaps */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Your Roadmaps</h2>
            <button onClick={createRoadmap} className="btn-primary text-sm">+ New Roadmap</button>
          </div>
          {loading ? (
            <div className="card p-8 flex justify-center"><div className="w-5 h-5 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" /></div>
          ) : roadmaps.length === 0 ? (
            <div className="card p-8 text-center text-gray-500">
              <p>No roadmaps yet</p>
              <button onClick={createRoadmap} className="btn-primary text-sm mt-3">Create your first roadmap</button>
            </div>
          ) : (
            <div className="space-y-3">
              {roadmaps.map(r => (
                <Link key={r.id} to={`/roadmap/${r.id}`} className="card p-4 block hover:border-neon-cyan/30 transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-8 rounded-full bg-neon-cyan/40" />
                      <div>
                        <h3 className="font-medium">{r.title}</h3>
                        <p className="text-xs text-gray-500">{r.milestone_count || 0} milestones</p>
                      </div>
                    </div>
                    <button onClick={(e) => deleteRoadmap(r.id, e)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm">✕</button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Todo List */}
        <div>
          <h2 className="text-lg font-semibold mb-6">Tasks</h2>
          <TodoList />
        </div>
      </div>
    </div>
  )
}
