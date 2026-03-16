import { useState, useEffect } from 'react'

export default function Header({ user, channels, config }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    function tick() { setTime(new Date().toLocaleTimeString('en-US', {hour12:false})) }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const totalViewers = 0 // computed in app.js and passed if needed
  const keys = config?.apiKeys?.length || 0

  return (
    <header className="flex items-center justify-between px-6 flex-shrink-0"
            style={{height:52,background:'rgba(6,15,33,0.95)',borderBottom:'1px solid rgba(0,212,255,0.07)',backdropFilter:'blur(12px)'}}>

      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="live-dot live-dot-cyan" style={{width:7,height:7}}/>
          <span className="font-mono text-xs" style={{color:'#2a6080',letterSpacing:'0.06em'}}>SYSTEM ONLINE</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded"
             style={{background:'rgba(0,212,255,0.04)',border:'1px solid rgba(0,212,255,0.08)'}}>
          <span className="font-mono text-xs" style={{color:'#1e3a5f'}}>CHANNELS</span>
          <span className="font-mono text-xs font-bold" style={{color:'#00d4ff'}}>{channels.length}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded"
             style={{background:'rgba(16,255,154,0.04)',border:'1px solid rgba(16,255,154,0.08)'}}>
          <span className="font-mono text-xs" style={{color:'#1e3a5f'}}>KEYS</span>
          <span className={`font-mono text-xs font-bold ${keys>0?'neon-green':''}`} style={keys===0?{color:'#2a4a6a'}:{}}>{keys}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="font-mono text-xs" style={{color:'#1e3a5f'}}>🕐</span>
          <span className="font-mono text-xs" style={{color:'#2a6080'}}>{time}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
               style={{background:'rgba(0,212,255,0.1)',border:'1px solid rgba(0,212,255,0.2)',color:'#00d4ff'}}>
            {user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="hidden sm:block text-xs truncate max-w-32" style={{color:'#2a4a6a'}}>{user?.email}</span>
        </div>
      </div>
    </header>
  )
}
