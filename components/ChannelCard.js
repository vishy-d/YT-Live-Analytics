import { useState } from 'react'

const fmtExact = n => Number(n||0).toLocaleString('en-IN')

export default function ChannelCard({ ch, index, onStart, onStop, onRemove, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const viewers  = ch.viewers  || 0
  const streams  = ch.streams  || []
  const logLines = ch.log      || []

  return (
    <div
      className={`ch-card ${ch.capturing?'capturing':''}`}
      style={{animationDelay:`${index*50}ms`, width:296}}
    >
      {/* Top accent bar handled by CSS .ch-card::after */}

      {/* Header row */}
      <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12}}>
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:'flex', alignItems:'center', gap:7, marginBottom:6}}>
            {ch.capturing && (
              <div className="live-ring" style={{flexShrink:0}}>
                <span className="live-dot" style={{width:6, height:6}}/>
              </div>
            )}
            <h4 style={{
              fontFamily:"'IBM Plex Sans',sans-serif",
              fontWeight:600, fontSize:14, color:'var(--text1)',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              margin:0, letterSpacing:'-0.01em',
            }}>{ch.channelName}</h4>
          </div>
          <div style={{display:'flex', flexWrap:'wrap', gap:4, marginBottom:5}}>
            <span className="badge badge-violet" style={{fontSize:9}}>{ch.language}</span>
            <span className="badge badge-blue"   style={{fontSize:9}}>{ch.colName}</span>
          </div>
          <div style={{fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'var(--text3)', letterSpacing:'.02em'}}>{ch.channelId}</div>
        </div>
        <button
          onClick={() => onRemove(ch.firestoreId)}
          title="Remove channel"
          style={{
            marginLeft:10, flexShrink:0,
            background:'transparent', border:'1px solid var(--border)',
            color:'var(--text3)', borderRadius:5, padding:'3px 7px',
            cursor:'pointer', fontSize:11, fontWeight:600,
            transition:'all .15s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,69,58,.4)';e.currentTarget.style.color='var(--red)'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text4)'}}
        >✕</button>
      </div>

      {/* Viewer count display */}
      <div style={{
        textAlign:'center', padding:'14px 10px',
        borderRadius:6,
        background:'var(--bg)',
        border:'1px solid var(--border)',
        margin:'0 0 12px',
        position:'relative', overflow:'hidden',
      }}>
        <div
          className="num-in"
          key={viewers}
          style={{
            fontFamily:"'IBM Plex Mono',monospace",
            fontWeight:600,
            letterSpacing:'-0.03em',
            lineHeight:1.05,
            fontSize: viewers>9999999?26 : viewers>999999?32 : viewers>99999?36 : 42,
            color: ch.capturing ? 'var(--blue2)' : 'var(--text3)',
            transition:'color .4s',
          }}
        >
          {fmtExact(viewers)}
        </div>
        <div style={{
          fontSize:11, fontWeight:500,
          color:'var(--text3)', marginTop:5,
          fontFamily:"'IBM Plex Sans',sans-serif",
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          <span>{streams.length} stream{streams.length!==1?'s':''} live</span>
          {ch.capturing && (
            <span style={{display:'flex', alignItems:'center', gap:4, color:'var(--green)'}}>
              <span style={{width:5, height:5, borderRadius:'50%', background:'var(--green)', display:'inline-block'}}/>
              capturing
            </span>
          )}
        </div>
        {/* Bottom shimmer bar when capturing */}
        {ch.capturing && (
          <div style={{
            position:'absolute', bottom:0, left:0, right:0, height:2,
            background:'linear-gradient(90deg,transparent,var(--green),transparent)',
            animation:'shimmerPass 2.2s linear infinite',
            backgroundSize:'200% 100%',
          }}/>
        )}
      </div>

      {/* Stream list */}
      {streams.length > 0 && (
        <div style={{marginBottom:12}}>
          <button
            onClick={() => setExpanded(p=>!p)}
            style={{
              fontWeight:500, fontSize:11, color:'var(--text3)',
              background:'none', border:'none', cursor:'pointer',
              padding:'0 0 6px', display:'flex', alignItems:'center', gap:5,
              fontFamily:"'IBM Plex Sans',sans-serif",
              transition:'color .15s',
            }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--text1)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--text3)'}
          >
            <span style={{
              display:'inline-block',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition:'transform .18s',
              fontSize:10,
            }}>▶</span>
            {streams.length} active stream{streams.length>1?'s':''}
          </button>
          {expanded && (
            <div className="animate-fade-in" style={{display:'flex', flexDirection:'column', gap:4}}>
              {streams.map(s => (
                <div key={s.id} style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'6px 10px', borderRadius:5,
                  background:'var(--bg3)', border:'1px solid var(--border)',
                }}>
                  <div style={{display:'flex', alignItems:'center', gap:6, minWidth:0}}>
                    <span className="live-dot" style={{width:4, height:4, flexShrink:0}}/>
                    <span style={{
                      fontSize:11, fontWeight:400, color:'var(--text2)',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:155,
                    }}>{s.title}</span>
                  </div>
                  <span style={{
                    fontFamily:"'IBM Plex Mono',monospace",
                    fontSize:11, fontWeight:600,
                    flexShrink:0, marginLeft:8, color:'var(--blue2)',
                  }}>{fmtExact(s.views||0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div style={{display:'flex', gap:7, marginBottom:12}}>
        {ch.capturing
          ? <button className="btn btn-ghost btn-sm" style={{flex:1, justifyContent:'center'}} onClick={() => onStop(ch.channelId)}>
              <span style={{color:'var(--red)', fontSize:9}}>■</span> Stop
            </button>
          : <button className="btn btn-green btn-sm" style={{flex:1, justifyContent:'center'}} onClick={() => onStart(ch.channelId)}>
              <span style={{fontSize:9}}>▶</span> Start
            </button>
        }
        <button
          className="btn btn-ghost btn-xs"
          style={{padding:'6px 10px'}}
          onClick={() => onRefresh(ch.channelId)}
          title="Refresh now"
        >↺</button>
      </div>

      {/* Activity log */}
      <div className="log-box">
        {logLines.length===0
          ? <span style={{color:'var(--text3)'}}>Waiting to capture…</span>
          : logLines.map((l,i) => {
              const cls = l.includes('✅')?'log-ok':l.includes('❌')?'log-err':l.includes('⚠')?'log-warn':'log-info'
              return <div key={i} className={cls}>{l}</div>
            })
        }
      </div>
    </div>
  )
}
