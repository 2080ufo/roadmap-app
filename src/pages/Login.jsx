import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: err } = isSignUp ? await signUp(email, password) : await signIn(email, password)
      if (err) setError(err.message)
    } catch (err) { setError('Something went wrong') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-3 h-3 rounded-full bg-accent-blue mx-auto mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">Roadmap</h1>
          <p className="text-text-muted text-sm mt-1">Plan your journey</p>
        </div>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</div>}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required minLength={6} />
          <button type="submit" disabled={loading} className="w-full btn-primary py-3 font-medium disabled:opacity-50">
            {loading ? '...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
          <p className="text-center text-sm text-text-muted">
            {isSignUp ? 'Have an account?' : "Don't have an account?"}{' '}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-accent-blue hover:underline">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
