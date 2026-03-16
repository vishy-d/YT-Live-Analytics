import { useState } from 'react'
import { auth } from '../lib/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/router'

const VIEWS = [
  { id: 'config',   icon: '⚙', label: 'Config',       section: 'SETUP' },
  { id: 'channels', icon: '📡', label: 'Channels',     section: null },
  { id: 'live',     icon: '🔴', label: 'Current LIVE', section: 'ANALYTICS' },
  { id: 'dash',     icon: '📊', label: 'Dashboard',    section: null },
]

export default function Sidebar({ activeView, setView, channels, capturing }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function logout() {
    setLoggingOut(true)
    await signOut(auth)
    router.push('/login')
  }

  const totalViewers = channels.reduce((s,c) => s+(c.viewers||0), 0)

  return (
    <aside className="flex flex-col flex-shrink-0" style={{width:220,background:'#060f21',borderRight:'1px solid rgba(0,212,255,0.07)'}}>

      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3" style={{borderBottom:'1px solid rgba(0,212,255,0.07)'}}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
             style={{background:'rgba(255,45,85,0.15)',border:'1px solid rgba(255,45,85,0.3)'}}>
          <span style={{fontSize:14,color:'#ff2d55'}}>▶</span>
        </div>
        <div>
          <div className="font-display font-bold text-sm text-white leading-tight">YT Analytics</div>
          <div className="font-mono text-xs" style={{color:'#1e3a5f',fontSize:9,letterSpacing:'0.1em'}}>COMMAND CENTER</div>
        </div>
      </div>

      {/* Stats quick-view */}
      {channels.length > 0 && (
        <div className="mx-3 my-3 rounded-xl p-3 space-y-2"
             style={{background:'rgba(0,212,255,0.04)',border:'1px solid rgba(0,212,255,0.08)'}}>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{color:'#2a4a6a'}}>Total viewers</span>
            <span className="big-num text-lg neon-cyan">{totalViewers.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{color:'#2a4a6a'}}>Capturing</span>
            <span className="flex items-center gap-1.5">
              {capturing > 0 && <span className="live-dot" style={{width:6,height:6}}/>}
              <span className={`font-mono text-xs ${capturing>0?'neon-green':''}`} style={capturing===0?{color:'#2a4a6a'}:{}}>{capturing}/{channels.length}</span>
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {VIEWS.map((v, i) => (
          <div key={v.id}>
            {v.section && <div className="nav-section">{v.section}</div>}
            <div className={`nav-item ${activeView===v.id?'active':''}`} onClick={() => setView(v.id)}>
              <span className="nav-icon text-base">{v.icon}</span>
              <span>{v.label}</span>
              {v.id==='live' && capturing>0 && (
                <span className="ml-auto live-dot" style={{width:6,height:6}}/>
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 space-y-2" style={{borderTop:'1px solid rgba(0,212,255,0.07)'}}>
        <button className="btn btn-ghost btn-sm w-full justify-center" onClick={logout} disabled={loggingOut}>
          {loggingOut ? '…' : '⎋ Sign Out'}
        </button>
        <p className="text-center font-mono" style={{fontSize:9,color:'#1e3a5f',letterSpacing:'0.08em'}}>VS InfoTech · Chennai</p>
      </div>
    </aside>
  )
}
