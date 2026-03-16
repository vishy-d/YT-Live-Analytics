import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth } from '../lib/firebase'
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth'
import Head from 'next/head'

export default function Login() {
  const router = useRouter()
  const [email,    setEmail]    = useState('admin@ytlive.app')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [mounted,  setMounted]  = useState(false)

  useEffect(() => {
    setMounted(true)
    const unsub = onAuthStateChanged(auth, u => { if (u) router.replace('/app') })
    return unsub
  }, [router])

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.replace('/app')
    } catch (err) {
      const msg = {
        'auth/invalid-credential':   'Invalid email or password.',
        'auth/user-not-found':        'No account found. Contact your admin.',
        'auth/wrong-password':        'Incorrect password.',
        'auth/too-many-requests':     'Too many attempts. Try again later.',
      }[err.code] || 'Login failed. Check credentials.'
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Sign In — YT LIVE Analytics</title></Head>
      <div className="min-h-screen bg-mesh bg-grid-pattern flex items-center justify-center relative overflow-hidden">

        {/* Ambient orbs */}
        <div className="login-orb" style={{width:500,height:500,background:'rgba(255,45,85,0.06)',top:'-10%',left:'-10%'}}/>
        <div className="login-orb" style={{width:600,height:600,background:'rgba(0,212,255,0.05)',bottom:'-15%',right:'-10%'}}/>
        <div className="login-orb" style={{width:300,height:300,background:'rgba(139,92,246,0.04)',top:'40%',left:'30%'}}/>

        {/* Scan line */}
        <div className="scan-line"/>

        {/* Card */}
        <div className={`relative z-10 w-full max-w-sm mx-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* Logo area */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 relative"
                 style={{background:'rgba(255,45,85,0.12)',border:'1px solid rgba(255,45,85,0.3)'}}>
              <span style={{fontSize:28}}>▶</span>
              <div className="absolute inset-0 rounded-2xl" style={{boxShadow:'0 0 24px rgba(255,45,85,0.25)'}}/>
            </div>
            <h1 className="font-display text-2xl font-bold text-white tracking-wide">YT LIVE Analytics</h1>
            <p className="text-xs mt-1 font-mono" style={{color:'#2a4a6a'}}>COMMAND CENTER // VS INFOTECH</p>
          </div>

          {/* Form card */}
          <div className="glass p-8 relative overflow-hidden">
            <div className="scan-line" style={{animationDuration:'5s'}}/>

            <h2 className="font-display text-lg font-semibold mb-1" style={{color:'#c8dff5'}}>Access Terminal</h2>
            <p className="text-xs mb-6" style={{color:'#2a4a6a'}}>Enter credentials to continue</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono mb-1.5" style={{color:'#4a6080',letterSpacing:'0.08em'}}>EMAIL ADDRESS</label>
                <input
                  className="input-cyber"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@ytlive.app"
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-xs font-mono mb-1.5" style={{color:'#4a6080',letterSpacing:'0.08em'}}>PASSWORD</label>
                <input
                  className="input-cyber"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  autoComplete="current-password"
                  onKeyDown={e => e.key==='Enter' && handleLogin(e)}
                />
              </div>

              {error && (
                <div className="rounded-lg px-3 py-2 text-xs font-mono flex items-center gap-2"
                     style={{background:'rgba(255,45,85,0.1)',border:'1px solid rgba(255,45,85,0.25)',color:'#ff6b85'}}>
                  <span>⚠</span> {error}
                </div>
              )}

              <button className="btn btn-red w-full justify-center mt-2 py-3" type="submit" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="live-dot live-dot-cyan" style={{width:6,height:6}}/>
                    Authenticating…
                  </span>
                ) : '⚡ Sign In'}
              </button>
            </form>

            <div className="divider"/>
            <p className="text-center text-xs" style={{color:'#1e3a5f'}}>
              First time? Create an account in <span style={{color:'#2a4a6a'}}>Firebase Console → Authentication</span>
            </p>
          </div>

          <p className="text-center mt-4 text-xs font-mono" style={{color:'#1e3a5f'}}>
            © VS InfoTech, Chennai · All rights reserved
          </p>
        </div>
      </div>
    </>
  )
}
