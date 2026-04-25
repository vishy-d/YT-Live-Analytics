import { useState, useEffect } from 'react'

const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const pad    = n => String(n).padStart(2,'0')

function fmtDT(d) {
  return {
    date: `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${DAYS[d.getDay()]}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  }
}

export default function Header({ user, channels, config, theme, toggleTheme }) {
  const [dt, setDt] = useState({ date:'', time:'' })
  useEffect(() => {
    const t = setInterval(() => setDt(fmtDT(new Date())), 1000)
    setDt(fmtDT(new Date()))
    return () => clearInterval(t)
  }, [])
  const keys   = config?.apiKeys?.length || 0
  const isDark = theme === 'dark'

  return (
    <header style={{
      height:56,
      background: isDark ? 'rgba(8,9,13,.92)' : 'rgba(248,249,252,.92)',
      borderBottom:'1px solid var(--border)',
      backdropFilter:'blur(24px)',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 24px',
      flexShrink:0,
      transition:'background .4s ease',
    }}>
      {/* Left: status pills */}
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <div className="status-pill status-online">
          <div className="live-ring">
            <span className="live-dot live-dot-blue" style={{width:5, height:5}}/>
          </div>
          ONLINE
        </div>

        <div style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'4px 12px', borderRadius:6,
          background:'var(--bg3)', border:'1px solid var(--border)',
        }}>
          <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--text3)', letterSpacing:'.06em'}}>CH</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700, color:'var(--blue2)'}}>
            {channels.length}
          </span>
        </div>

        <div style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'4px 12px', borderRadius:6,
          background: keys>0?'rgba(52,211,153,.06)':'rgba(248,113,113,.06)',
          border:`1px solid ${keys>0?'rgba(52,211,153,.18)':'rgba(248,113,113,.18)'}`,
        }}>
          <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--text3)', letterSpacing:'.06em'}}>KEYS</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700, color:keys>0?'var(--green)':'var(--red)'}}>
            {keys}
          </span>
        </div>
      </div>

      {/* Right */}
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <button className="theme-btn" onClick={toggleTheme} title={isDark?'Light mode':'Dark mode'}>
          {isDark ? '☀' : '☾'}
        </button>

        {/* Clock */}
        <div style={{
          display:'flex', flexDirection:'column', alignItems:'flex-end',
          padding:'5px 14px', borderRadius:8,
          background:'var(--bg3)', border:'1px solid var(--border)',
        }}>
          <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:'var(--text3)', letterSpacing:'.04em', lineHeight:1.3}}>
            {dt.date}
          </span>
          <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:700, color:'var(--text1)', letterSpacing:'.06em', lineHeight:1.3}}>
            {dt.time}
          </span>
        </div>

        {/* User */}
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{
            width:32, height:32, borderRadius:'50%',
            background:'var(--gradient-primary)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:700, fontSize:13, color:'#fff',
            fontFamily:"'Inter',sans-serif",
            flexShrink:0,
            boxShadow:'0 2px 12px rgba(99,102,241,.3)',
          }}>
            {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{display:'flex', flexDirection:'column'}}>
            {user?.displayName && (
              <span style={{fontSize:12, fontWeight:600, color:'var(--text1)', lineHeight:1.3}}>
                {user.displayName}
              </span>
            )}
            <span style={{fontSize:11, color:'var(--text3)', maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', lineHeight:1.3}}>
              {user?.email}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
