import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  return (
    <nav className="border-b border-dark-600 bg-dark-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
          <span className="font-semibold tracking-tight">Roadmap</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button onClick={signOut} className="text-sm text-gray-400 hover:text-white transition-colors">Sign out</button>
        </div>
      </div>
    </nav>
  )
}
