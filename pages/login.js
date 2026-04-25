import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { auth } from '../lib/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, updateProfile } from 'firebase/auth'
import Head from 'next/head'

export default function Login() {
  const router   = useRouter()
  const [mode,    setMode]    = useState('login')
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [ready,   setReady]   = useState(false)
  const [showPw,  setShowPw]  = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60)
    const u = onAuthStateChanged(auth, u => { if (u) router.replace('/app') })
    return () => { clearTimeout(t); u() }
  }, [router])

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !pass) { setError('Enter email and password.'); return }
    setError(''); setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, pass)
      router.replace('/app')
    } catch (err) {
      const m = { 'auth/invalid-credential':'Invalid email or password.', 'auth/user-not-found':'No account found. Register first.', 'auth/wrong-password':'Incorrect password.', 'auth/too-many-requests':'Too many attempts. Try later.', 'auth/invalid-email':'Enter a valid email.' }
      setError(m[err.code] || err.message)
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!name.trim())         { setError('Enter your full name.'); return }
    if (!email)               { setError('Enter email address.'); return }
    if (pass.length < 6)      { setError('Password must be 6+ characters.'); return }
    if (pass !== confirm)     { setError('Passwords do not match.'); return }
    setError(''); setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass)
      await updateProfile(cred.user, { displayName: name.trim() })
      router.replace('/app')
    } catch (err) {
      const m = { 'auth/email-already-in-use':'Account exists. Sign in instead.', 'auth/invalid-email':'Enter a valid email.', 'auth/weak-password':'Use 6+ characters.' }
      setError(m[err.code] || err.message)
      setLoading(false)
    }
  }

  const sw = m => { setMode(m); setError(''); setName(''); setEmail(''); setPass(''); setConfirm('') }

  return (
    <>
      <Head><title>{mode==='register'?'Create Account':'Sign In'} — YouTube Analytics</title></Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body,#__next{height:100%}
        body{font-family:'Inter',sans-serif;background:#08090d;color:#fff;overflow:hidden}

        .root{height:100vh;width:100vw;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:#08090d}

        /* Tableau-style colored accent lines in background */
        .bg-lines{position:absolute;inset:0;pointer-events:none;overflow:hidden}
        .bg-lines::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#1d4ed8 0%,#3b82f6 30%,#14b8a6 60%,#22c55e 100%)}
        .bg-lines::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(59,130,246,.3),transparent)}

        /* Grid */
        .grid{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,rgba(255,255,255,0.035) 1px,transparent 1px);background-size:24px 24px}

        /* Glows */
        .g1{position:absolute;width:600px;height:600px;border-radius:50%;filter:blur(140px);pointer-events:none;background:rgba(29,78,216,.08);top:-200px;left:-100px}
        .g2{position:absolute;width:500px;height:500px;border-radius:50%;filter:blur(140px);pointer-events:none;background:rgba(20,184,166,.06);bottom:-150px;right:-80px}

        /* Card */
        .card{position:relative;z-index:10;background:#0e1017;border:1px solid rgba(255,255,255,0.09);border-radius:16px;padding:38px;width:430px;max-width:96vw;box-shadow:0 32px 80px rgba(0,0,0,.6),0 0 60px rgba(99,102,241,.08);opacity:0;transform:translateY(14px);transition:opacity .3s,transform .3s}
        .card.ready{opacity:1;transform:translateY(0)}

        /* Top accent bar */
        .top-bar{position:absolute;top:0;left:0;right:0;height:3px;border-radius:16px 16px 0 0;background:var(--accent, linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7))}

        /* Logo */
        .logo{width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,rgba(239,68,68,.2),rgba(248,113,113,.1));border:1px solid rgba(248,113,113,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;animation:iconPulse 2.8s ease-in-out infinite}
        @keyframes iconPulse{0%,100%{box-shadow:0 0 10px rgba(239,68,68,.15)}50%{box-shadow:0 0 24px rgba(239,68,68,.35)}}

        .app-name{text-align:center;font-family:'Inter',sans-serif;font-weight:700;font-size:20px;color:#ffffff;letter-spacing:-.02em;margin-bottom:4px}
        .app-sub{text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:#606878;letter-spacing:.12em;text-transform:uppercase;margin-bottom:28px}

        /* Tabs */
        .tabs{display:flex;gap:2px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:3px;margin-bottom:24px}
        .tab{flex:1;padding:8px;border:none;background:transparent;font-family:'Inter',sans-serif;font-size:13px;font-weight:500;color:#9ba5b5;cursor:pointer;border-radius:5px;transition:all .15s}
        .tab.on{background:rgba(59,130,246,.2);color:#93c5fd;font-weight:700;border:1px solid rgba(59,130,246,.3)}
        .tab:not(.on):hover{color:#d8dde8}

        /* Fields */
        .fg{margin-bottom:14px}
        .fl{display:block;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.10em;color:#9ba5b5;text-transform:uppercase;margin-bottom:6px}
        .fi{width:100%;padding:10px 14px;background:#181b24;border:1.5px solid rgba(255,255,255,.10);border-radius:7px;color:#ffffff;font-family:'Inter',sans-serif;font-size:14px;outline:none;transition:border-color .18s,box-shadow .18s}
        .fi:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.15)}
        .fi::placeholder{color:#606878}

        .pw{position:relative}
        .pt{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:#606878;font-size:14px;padding:4px;transition:color .15s}
        .pt:hover{color:#d8dde8}

        .err{padding:10px 14px;border-radius:7px;background:rgba(239,68,68,.12);border:1.5px solid rgba(239,68,68,.3);color:#fca5a5;font-size:13px;display:flex;align-items:flex-start;gap:8px;margin-bottom:14px;animation:shk .3s ease}
        @keyframes shk{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}

        .sb{width:100%;padding:12px;border:none;border-radius:7px;color:#fff;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:.01em}
        .sb-in{background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 2px 14px rgba(99,102,241,.4)}
        .sb-in:hover:not(:disabled){background:linear-gradient(135deg,#818cf8,#a78bfa);box-shadow:0 4px 24px rgba(99,102,241,.55);transform:translateY(-1px)}
        .sb-re{background:linear-gradient(135deg,#10b981,#34d399);box-shadow:0 2px 14px rgba(16,185,129,.35)}
        .sb-re:hover:not(:disabled){background:#22c55e;box-shadow:0 4px 20px rgba(22,163,74,.5);transform:translateY(-1px)}
        .sb:active:not(:disabled){transform:scale(.98)!important}
        .sb:disabled{opacity:.45;cursor:not-allowed}

        .sp{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .65s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .dv{height:1px;background:rgba(255,255,255,.07);margin:20px 0}
        .ft{text-align:center;font-family:'JetBrains Mono',monospace;font-size:9px;color:#606878;letter-spacing:.10em;text-transform:uppercase}
      `}</style>

      <div className="root">
        <div className="bg-lines"/><div className="grid"/>
        <div className="g1"/><div className="g2"/>

        <div className={`card ${ready?'ready':''}`}
             style={{'--accent':mode==='register'?'linear-gradient(135deg,#10b981,#34d399)':'linear-gradient(135deg,#6366f1,#8b5cf6,#a855f7)'}}>
          <div className="top-bar"/>

          {/* Brand */}
          <div className="logo"><span style={{color:'#ef4444',fontSize:20}}>▶</span></div>
          <div className="app-name">YouTube Analytics</div>
          <div className="app-sub">VS InfoTech · Live Monitoring</div>

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab ${mode==='login'?'on':''}`} onClick={()=>sw('login')}>Sign In</button>
            <button className={`tab ${mode==='register'?'on':''}`} onClick={()=>sw('register')}>Create Account</button>
          </div>

          {mode==='login'&&(
            <form onSubmit={handleLogin}>
              <div className="fg"><label className="fl">Email</label>
                <input className="fi" type="email" value={email} onChange={e=>{setEmail(e.target.value);setError('')}} placeholder="you@example.com" required autoFocus autoComplete="username"/></div>
              <div className="fg"><label className="fl">Password</label>
                <div className="pw">
                  <input className="fi" type={showPw?'text':'password'} value={pass} onChange={e=>{setPass(e.target.value);setError('')}} placeholder="••••••••••••" required autoComplete="current-password" style={{paddingRight:38}}/>
                  <button type="button" className="pt" onClick={()=>setShowPw(p=>!p)}>{showPw?'◎':'●'}</button>
                </div></div>
              {error&&<div className="err"><span>⚠</span><span>{error}</span></div>}
              <button className="sb sb-in" type="submit" disabled={loading}>{loading?<><span className="sp"/>Signing in…</>:'Sign In →'}</button>
            </form>
          )}

          {mode==='register'&&(
            <form onSubmit={handleRegister}>
              <div className="fg"><label className="fl">Full Name</label>
                <input className="fi" type="text" value={name} onChange={e=>{setName(e.target.value);setError('')}} placeholder="Your full name" required autoFocus/></div>
              <div className="fg"><label className="fl">Email</label>
                <input className="fi" type="email" value={email} onChange={e=>{setEmail(e.target.value);setError('')}} placeholder="you@example.com" required autoComplete="username"/></div>
              <div className="fg"><label className="fl">Password</label>
                <div className="pw">
                  <input className="fi" type={showPw?'text':'password'} value={pass} onChange={e=>{setPass(e.target.value);setError('')}} placeholder="6+ characters" required style={{paddingRight:38}}/>
                  <button type="button" className="pt" onClick={()=>setShowPw(p=>!p)}>{showPw?'◎':'●'}</button>
                </div></div>
              <div className="fg"><label className="fl">Confirm Password</label>
                <input className="fi" type="password" value={confirm} onChange={e=>{setConfirm(e.target.value);setError('')}} placeholder="Repeat password" required autoComplete="new-password"/></div>
              {error&&<div className="err"><span>⚠</span><span>{error}</span></div>}
              <button className="sb sb-re" type="submit" disabled={loading}>{loading?<><span className="sp"/>Creating…</>:'Create Account →'}</button>
            </form>
          )}

          <div className="dv"/>
          <div className="ft">YouTube Analytics · VS InfoTech</div>
        </div>
      </div>
    </>
  )
}
