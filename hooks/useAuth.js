import { useState, useEffect } from 'react'
import { auth } from '../lib/firebase'
import { onAuthStateChanged, getIdToken } from 'firebase/auth'

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  async function getToken() {
    if (!auth.currentUser) return null
    return getIdToken(auth.currentUser)
  }

  return { user, loading, getToken }
}
