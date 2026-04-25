import { useState } from 'react'
import { auth } from '../lib/firebase'
import { signOut } from 'firebase/auth'
import { useRouter } from 'next/router'

const VIEWS = [
  { id:'config',   label:'Configuration', section:'SETUP',     emoji:'⚙' },
  { id:'channels', label:'Channels',      section:null,        emoji:'📡' },
  { id:'live',     label:'Current LIVE',   section:'ANALYTICS', emoji:'●' },
  { id:'dash',     label:'Dashboard',      section:null,        emoji:'▦' },
]

export default function Sidebar({ activeView, setView, channels }) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function logout() {
    setLoggingOut(true)
    await signOut(auth)
    router.push('/login')
  }

  return (
    <aside style={{
      width:232, flexShrink:0,
      background:'var(--bg2)',
      borderRight:'1px solid var(--border)',
      display:'flex', flexDirection:'column',
      transition:'background .4s ease',
    }}>
      {/* Logo */}
      <div style={{
        padding:'18px 20px',
        borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:14,
      }}>
        <div style={{
          width:38, height:38, borderRadius:10,
          background:'var(--gradient-danger)',
          display:'flex', alignItems:'center', justifyContent:'center',
          flexShrink:0,
          boxShadow:'0 4px 16px rgba(248,113,113,.25)',
          animation:'iconPulse 2.8s ease-in-out infinite',
        }}>
          <span style={{fontSize:16, color:'#fff', fontWeight:700}}>▶</span>
        </div>
        <div>
          <div style={{
            fontFamily:"'Inter',sans-serif",
            fontWeight:800, fontSize:15,
            color:'var(--text1)', lineHeight:1.2,
            letterSpacing:'-0.02em',
          }}>YouTube Analytics</div>
          <div style={{
            fontFamily:"'JetBrains Mono',monospace",
            fontSize:9, color:'var(--text3)',
            letterSpacing:'0.14em', marginTop:2,
          }}>LIVE MONITORING</div>
        </div>
      </div>

      {/* Channel count chip */}
      {channels.length > 0 && (
        <div style={{
          margin:'12px 14px 0', padding:'10px 14px', borderRadius:8,
          background:'var(--gradient-glass)', border:'1px solid var(--border)',
        }}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <span style={{
              fontSize:11, fontWeight:600, color:'var(--text2)',
              fontFamily:"'JetBrains Mono',monospace",
              letterSpacing:'.05em', textTransform:'uppercase',
            }}>Channels</span>
            <span style={{
              fontFamily:"'JetBrains Mono',monospace",
              fontSize:20, fontWeight:700, color:'var(--blue2)',
            }}>{channels.length}</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{flex:1, padding:'10px 10px', overflowY:'auto'}}>
        {VIEWS.map(v => (
          <div key={v.id}>
            {v.section && (
              <div style={{
                padding:'14px 10px 6px',
                fontFamily:"'JetBrains Mono',monospace",
                fontSize:9, fontWeight:600,
                letterSpacing:'0.16em', color:'var(--text4)',
                textTransform:'uppercase',
              }}>{v.section}</div>
            )}
            <div
              className={`nav-item ${activeView===v.id?'active':''}`}
              onClick={() => setView(v.id)}
            >
              <span style={{
                fontSize: v.id==='live' ? 9 : 14,
                color: activeView===v.id ? 'var(--blue2)' : 'var(--text4)',
                width:20, textAlign:'center', flexShrink:0,
              }}>{v.emoji}</span>
              <span>{v.label}</span>
              {v.id==='live' && (
                <span className="live-dot" style={{marginLeft:'auto', width:6, height:6}}/>
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{padding:'12px 12px', borderTop:'1px solid var(--border)'}}>
        <button
          className="btn btn-ghost btn-sm"
          style={{width:'100%', justifyContent:'center', fontSize:12}}
          onClick={logout}
          disabled={loggingOut}
        >
          {loggingOut ? '…' : '⎋  Sign Out'}
        </button>
        <p style={{
          textAlign:'center',
          fontFamily:"'JetBrains Mono',monospace",
          fontSize:9, color:'var(--text4)',
          letterSpacing:'0.12em', marginTop:10,
        }}>VS InfoTech · Chennai</p>
      </div>
    </aside>
  )
}
