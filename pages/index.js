import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

export default function Index() {
  const router = useRouter()
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      router.replace(user ? '/app' : '/login')
    })
    return unsub
  }, [router])
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="live-dot live-dot-cyan w-3 h-3"/>
        <span className="font-mono text-sm" style={{color:'#2a4a6a'}}>Initializing…</span>
      </div>
    </div>
  )
}
