import { useState } from 'react'

export default function ChannelCard({ ch, index, onStart, onStop, onRemove, onRefresh }) {
  const [expanded, setExpanded] = useState(false)

  const viewers = ch.viewers || 0
  const streams = ch.streams || []

  function fmtNum(n) {
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M'
    if (n >= 1e3) return (n/1e3).toFixed(0)+'K'
    return n.toLocaleString()
  }

  const logLines = ch.log || []

  return (
    <div className={`ch-card ${ch.capturing ? 'capturing' : ''} animate-slide-up`}
         style={{animationDelay:`${index*40}ms`}}>

      {/* Top bar */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {ch.capturing && <span className="live-dot" style={{width:7,height:7,flexShrink:0}}/>}
            <h4 className="font-display font-bold text-white text-sm truncate">{ch.channelName}</h4>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="badge badge-violet" style={{fontSize:10}}>{ch.language}</span>
            <span className="badge badge-cyan" style={{fontSize:10}}>{ch.colName}</span>
          </div>
          <div className="font-mono mt-1" style={{color:'#1e3a5f',fontSize:10}}>{ch.channelId}</div>
        </div>
        <button className="btn btn-xs ml-2 flex-shrink-0"
                style={{background:'rgba(255,45,85,0.08)',border:'1px solid rgba(255,45,85,0.15)',color:'#4a4060'}}
                onClick={() => onRemove(ch.firestoreId)} title="Remove channel">✕</button>
      </div>

      {/* Viewer count */}
      <div className="my-3 text-center py-3 rounded-xl relative overflow-hidden"
           style={{background:'rgba(3,10,26,0.5)',border:'1px solid rgba(0,212,255,0.07)'}}>
        <div className={`big-num text-5xl ${ch.capturing ? 'neon-cyan' : ''}`}
             style={!ch.capturing ? {color:'#1e3a5f'} : {}}>
          {fmtNum(viewers)}
        </div>
        <div className="text-xs mt-1" style={{color:'#2a4a6a'}}>
          {streams.length} stream{streams.length!==1?'s':''} · {ch.capturing ? 'capturing every 60s' : 'idle'}
        </div>
        {/* Progress glow bar */}
        {ch.capturing && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5"
               style={{background:'linear-gradient(90deg,transparent,rgba(0,212,255,0.5),transparent)'}}/>
        )}
      </div>

      {/* Stream list */}
      {streams.length > 0 && (
        <div className="mb-3">
          <button className="text-xs mb-1.5 flex items-center gap-1"
                  style={{color:'#2a6080',background:'none',border:'none',cursor:'pointer',padding:0}}
                  onClick={() => setExpanded(p => !p)}>
            {expanded ? '▾' : '▸'} {streams.length} live stream{streams.length>1?'s':''}
          </button>
          {expanded && (
            <div className="space-y-1">
              {streams.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg px-2 py-1.5"
                     style={{background:'rgba(0,212,255,0.03)',border:'1px solid rgba(0,212,255,0.06)'}}>
                  <span className="text-xs truncate mr-2" style={{color:'#4a6080',maxWidth:160}}
                        title={s.title}>{s.title}</span>
                  <span className="font-mono text-xs font-medium flex-shrink-0" style={{color:'#00d4ff'}}>{fmtNum(s.views||0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2 mb-3">
        {ch.capturing ? (
          <button className="btn btn-ghost btn-sm flex-1 justify-center" onClick={() => onStop(ch.channelId)}>
            <span style={{color:'#ff2d55'}}>■</span> Stop
          </button>
        ) : (
          <button className="btn btn-green btn-sm flex-1 justify-center" onClick={() => onStart(ch.channelId)}>
            ▶ Start
          </button>
        )}
        <button className="btn btn-ghost btn-xs px-3" onClick={() => onRefresh(ch.channelId)} title="Refresh now">🔄</button>
      </div>

      {/* Log */}
      <div className="log-box">
        {logLines.length === 0
          ? <span style={{color:'#1e3a5f'}}>No log entries yet</span>
          : logLines.map((l, i) => {
              const cls = l.includes('✅')||l.includes('viewers written') ? 'log-ok'
                        : l.includes('❌') ? 'log-err'
                        : l.includes('⚠') ? 'log-warn'
                        : 'log-info'
              return <div key={i} className={cls}>{l}</div>
            })
        }
      </div>
    </div>
  )
}
