import { useState, useEffect, useRef, useCallback } from 'react'

const POLL_MS = 10_000

export default function LiveView({ channels, config }) {
  const [liveData,    setLiveData]    = useState({})
  const [langFilter,  setLangFilter]  = useState('')
  const [polling,     setPolling]     = useState(false)
  const [lastUpdate,  setLastUpdate]  = useState(null)
  const [breakdowns,  setBreakdowns]  = useState({})
  const intervalRef = useRef(null)
  const apiIndex    = useRef(0)
  const apiKeys     = config?.apiKeys || []

  function getKey() {
    if (!apiKeys.length) throw new Error('No API keys')
    const k = apiKeys[apiIndex.current % apiKeys.length]
    apiIndex.current = (apiIndex.current + 1) % apiKeys.length
    return k
  }

  // Init slots for all channels
  useEffect(() => {
    setLiveData(prev => {
      const next = { ...prev }
      channels.forEach(ch => {
        if (!next[ch.channelId]) next[ch.channelId] = { viewers:0, streams:[], error:null }
      })
      Object.keys(next).forEach(id => {
        if (!channels.find(c => c.channelId===id)) delete next[id]
      })
      return next
    })
  }, [channels])

  // Auto-start polling on mount
  useEffect(() => {
    if (channels.length && apiKeys.length) {
      startPolling()
    }
    return stopPolling
  }, [channels.length, apiKeys.length])

  const pollAll = useCallback(async () => {
    if (!channels.length || !apiKeys.length) return

    const results = await Promise.allSettled(
      channels.map(async ch => {
        try {
          const apiKey = getKey()
          const res = await fetch('/api/youtube/live', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId: ch.channelId, apiKey }),
          })
          const data = await res.json()
          if (data.error) throw new Error(data.error)
          return { channelId: ch.channelId, ...data }
        } catch (e) {
          return { channelId: ch.channelId, error: e.message, total: 0, streams: [] }
        }
      })
    )

    setLiveData(prev => {
      const next = { ...prev }
      results.forEach(r => {
        if (r.status === 'fulfilled') {
          const { channelId, total, streams, error } = r.value
          next[channelId] = { viewers: total||0, streams: streams||[], error: error||null }
        }
      })
      return next
    })

    setLastUpdate(new Date())
  }, [channels, apiKeys])

  function startPolling() {
    if (intervalRef.current) return
    setPolling(true)
    pollAll()
    intervalRef.current = setInterval(pollAll, POLL_MS)
  }

  function stopPolling() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    setPolling(false)
  }

  function toggleBreakdown(key) {
    setBreakdowns(p => ({ ...p, [key]: !p[key] }))
  }

  function fmtNum(n) {
    if (n >= 1e6) return (n/1e6).toFixed(2)+'M'
    if (n >= 1e3) return (n/1e3).toFixed(0)+'K'
    return n.toLocaleString()
  }

  const langs = [...new Set(channels.map(c => c.language).filter(Boolean))]
  const visLangs = langFilter ? [langFilter] : langs
  const grandTotal = Object.values(liveData).reduce((s,d)=>s+(d.viewers||0),0)
  const totalStreams = Object.values(liveData).reduce((s,d)=>s+(d.streams?.length||0),0)

  return (
    <div className="animate-slide-up space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {polling && <span className="live-dot" style={{width:10,height:10}}/>}
            <h2 className="font-display text-2xl font-bold text-white">Current LIVE</h2>
            {polling && <span className="badge badge-green text-xs">AUTO-POLLING {POLL_MS/1000}s</span>}
          </div>
          <p style={{color:'#2a4a6a',fontSize:13}}>
            {lastUpdate
              ? <>Last update: <span style={{color:'#4a8090'}}>{lastUpdate.toLocaleTimeString()}</span></>
              : 'Real-time viewer counts across all channels'}
          </p>
        </div>
        <div className="flex gap-2">
          {polling
            ? <button className="btn btn-ghost btn-sm" onClick={stopPolling}>⏸ Pause</button>
            : <button className="btn btn-green btn-sm" onClick={startPolling}>▶ Resume</button>}
        </div>
      </div>

      {/* Grand total banner */}
      {channels.length > 0 && (
        <div className="glass p-5 relative overflow-hidden"
             style={{background:'rgba(3,10,26,0.7)'}}>
          <div className="scan-line" style={{opacity:.15,animationDuration:'3s'}}/>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-xs font-mono mb-1" style={{color:'#2a4a6a',letterSpacing:'0.1em'}}>TOTAL LIVE VIEWERS</div>
              <div className="big-num text-6xl neon-cyan animate-count-in">{fmtNum(grandTotal)}</div>
            </div>
            <div className="flex gap-6 text-center">
              <div>
                <div className="big-num text-3xl neon-red">{channels.length}</div>
                <div className="text-xs" style={{color:'#2a4a6a'}}>Channels</div>
              </div>
              <div>
                <div className="big-num text-3xl neon-green">{totalStreams}</div>
                <div className="text-xs" style={{color:'#2a4a6a'}}>Live Streams</div>
              </div>
              <div>
                <div className="big-num text-3xl neon-amber">{langs.length}</div>
                <div className="text-xs" style={{color:'#2a4a6a'}}>Languages</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Language filter */}
      {langs.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {['', ...langs].map(l => (
            <button key={l||'all'} onClick={() => setLangFilter(l)}
                    className="btn btn-xs rounded-lg"
                    style={langFilter===l
                      ? {background:'rgba(0,212,255,0.15)',border:'1px solid rgba(0,212,255,0.4)',color:'#00d4ff'}
                      : {background:'rgba(0,212,255,0.04)',border:'1px solid rgba(0,212,255,0.08)',color:'#4a6080'}}>
              {l || '🌐 All'}
            </button>
          ))}
        </div>
      )}

      {/* No channels */}
      {!channels.length && (
        <div className="glass rounded-2xl p-12 text-center" style={{border:'1px dashed rgba(0,212,255,0.1)'}}>
          <div style={{fontSize:48,marginBottom:12}}>🔴</div>
          <h3 className="font-display text-lg font-semibold text-white mb-2">Nothing to monitor</h3>
          <p style={{color:'#2a4a6a',fontSize:13}}>Add channels in the Channel List screen first.</p>
        </div>
      )}

      {/* Language blocks */}
      {visLangs.map(lang => {
        const langChannels = channels.filter(c => c.language===lang)
        if (!langChannels.length) return null
        const langTotal = langChannels.reduce((s,ch)=>s+(liveData[ch.channelId]?.viewers||0),0)

        // Group by colName
        const groups = {}
        langChannels.forEach(ch => {
          if (!groups[ch.colName]) groups[ch.colName] = []
          groups[ch.colName].push(ch)
        })

        return (
          <div key={lang} className="space-y-3">
            {/* Language header */}
            <div className="flex items-center gap-3 pb-2"
                 style={{borderBottom:'1px solid rgba(0,212,255,0.08)'}}>
              <h3 className="font-display font-bold text-white text-lg">{lang}</h3>
              <span className="badge badge-cyan">{fmtNum(langTotal)} viewers</span>
              <span className="badge badge-violet">{langChannels.length} channels</span>
            </div>

            <div className="flex flex-wrap gap-3">
              {Object.entries(groups).map(([colName, chs]) => {
                const isGroup = chs.length > 1
                const totalV  = chs.reduce((s,ch)=>s+(liveData[ch.channelId]?.viewers||0),0)
                const allStreams = chs.flatMap(ch=>(liveData[ch.channelId]?.streams||[]))
                const bdKey   = `${lang}-${colName}`

                return (
                  <div key={bdKey}
                       className={`live-card ${isGroup?'group-card':''} animate-slide-up`}
                       style={{animationDelay:'50ms'}}>

                    {/* Card header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium truncate" style={{color:'#4a6080',maxWidth:160}} title={colName}>
                        {colName}
                      </span>
                      {isGroup && (
                        <span className="badge badge-amber" style={{fontSize:10}}>×{chs.length}</span>
                      )}
                    </div>

                    {/* Big viewer count */}
                    <div className={`big-num text-5xl ${isGroup?'neon-amber':'neon-cyan'} mb-1 animate-count-in`}>
                      {fmtNum(totalV)}
                    </div>
                    <div className="text-xs mb-3" style={{color:'#2a4a6a'}}>
                      {allStreams.length} stream{allStreams.length!==1?'s':''} live
                    </div>

                    {/* Breakdown toggle */}
                    {(allStreams.length > 0 || isGroup) && (
                      <>
                        <button className="text-xs" style={{color:'#00d4ff',background:'none',border:'none',cursor:'pointer',padding:0}}
                                onClick={() => toggleBreakdown(bdKey)}>
                          {breakdowns[bdKey] ? '▲ Hide' : '▼ Breakdown'}
                        </button>

                        {breakdowns[bdKey] && (
                          <div className="mt-3 space-y-2" style={{borderTop:'1px solid rgba(0,212,255,0.08)',paddingTop:10}}>
                            {isGroup
                              ? chs.map(ch => {
                                  const d = liveData[ch.channelId] || {}
                                  return (
                                    <div key={ch.channelId}>
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium" style={{color:'#c8dff5'}}>{ch.channelName}</span>
                                        <span className="font-mono text-xs neon-amber font-bold">{fmtNum(d.viewers||0)}</span>
                                      </div>
                                      {(d.streams||[]).map(s => (
                                        <div key={s.id} className="flex justify-between items-center pl-3 py-0.5">
                                          <span className="text-xs truncate" style={{color:'#2a4a6a',maxWidth:120}} title={s.title}>
                                            └ {s.title}
                                          </span>
                                          <span className="font-mono text-xs" style={{color:'#4a6080'}}>{fmtNum(s.views||0)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                })
                              : allStreams.map(s => (
                                  <div key={s.id} className="flex justify-between items-center">
                                    <span className="text-xs truncate" style={{color:'#4a6080',maxWidth:140}} title={s.title}>{s.title}</span>
                                    <span className="font-mono text-xs neon-cyan">{fmtNum(s.views||0)}</span>
                                  </div>
                                ))
                            }
                          </div>
                        )}
                      </>
                    )}

                    {/* Error */}
                    {chs.some(ch=>liveData[ch.channelId]?.error) && (
                      <div className="mt-2 text-xs" style={{color:'#ff6b85'}}>
                        ⚠ {liveData[chs[0].channelId]?.error}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* No API keys warning */}
      {!apiKeys.length && (
        <div className="glass rounded-2xl p-5 text-center" style={{border:'1px solid rgba(255,183,0,0.2)'}}>
          <span style={{color:'#ffb700',fontSize:13}}>⚠ Add YouTube API keys in Config to enable live polling</span>
        </div>
      )}
    </div>
  )
}
