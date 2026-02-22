import { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/api'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    api.get('/api/auth/me')
      .then(u => setUser(u))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  const signUp = async (email, password) => {
    try {
      const { token, user } = await api.post('/api/auth/signup', { email, password })
      localStorage.setItem('token', token)
      setUser(user)
      return { error: null }
    } catch (e) {
      return { error: { message: e.message } }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { token, user } = await api.post('/api/auth/signin', { email, password })
      localStorage.setItem('token', token)
      setUser(user)
      return { error: null }
    } catch (e) {
      return { error: { message: e.message } }
    }
  }

  const signOut = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
