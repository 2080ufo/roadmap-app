import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  return (
    <nav className="border-b border-surface-600 bg-surface-900/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-accent-blue" />
          <span className="font-semibold tracking-tight">Roadmap</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-text-muted">{user?.email}</span>
          <button onClick={signOut} className="text-sm text-text-secondary hover:text-text-primary transition-colors">Sign out</button>
        </div>
      </div>
    </nav>
  )
}
