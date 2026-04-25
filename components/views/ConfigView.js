import { useState, useEffect, useRef } from 'react'

// ── Animated number counter ──
function AnimatedNumber({ value, duration = 600 }) {
  const [display, setDisplay] = useState(value)
  const ref = useRef({ start: value, target: value, startTime: 0 })

  useEffect(() => {
    const r = ref.current
    r.start = display
    r.target = value
    r.startTime = performance.now()

    function tick(now) {
      const elapsed = now - r.startTime
      const progress = Math.min(1, elapsed / duration)
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(r.start + (r.target - r.start) * eased)
      setDisplay(current)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <>{display.toLocaleString()}</>
}

// Status badge component
function StatusBadge({ status }) {
  const styles = {
    ACTIVE:   { bg: 'rgba(48,209,88,.12)', border: 'rgba(48,209,88,.35)', color: 'var(--green)', label: '● ACTIVE' },
    STANDBY:  { bg: 'rgba(10,132,255,.08)', border: 'rgba(10,132,255,.25)', color: 'var(--blue2)', label: '◦ STANDBY' },
    EXHAUSTED:{ bg: 'rgba(255,69,58,.1)',   border: 'rgba(255,69,58,.3)',  color: 'var(--red)',   label: '✕ EXHAUSTED' },
  }
  const s = styles[status] || styles.STANDBY
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      padding:'2px 8px', borderRadius:4,
      background:s.bg, border:`1px solid ${s.border}`,
      fontFamily:"'JetBrains Mono',monospace", fontSize:9, fontWeight:700,
      color:s.color, letterSpacing:'.04em',
      animation: status === 'ACTIVE' ? 'pulse 2s ease infinite' : 'none',
    }}>
      {s.label}
    </span>
  )
}

export default function ConfigView({ config, addApiKey, removeApiKey, user, updateCaptureInterval }) {
  const [keyInput, setKeyInput] = useState('')
  const [adding,   setAdding]   = useState(false)
  const [showFull, setShowFull] = useState({})
  const [quotaData, setQuotaData] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [intervalInput, setIntervalInput] = useState('')
  const [savingInterval, setSavingInterval] = useState(false)
  const [intervalSaved, setIntervalSaved] = useState(false)
  const [savedInterval, setSavedInterval] = useState(60)
  const pollRef = useRef(null)

  const keys = config?.apiKeys || []
  // Use local savedInterval state — updated from config prop AND after save
  const currentInterval = savedInterval

  // Sync from config prop on mount / when config changes
  useEffect(() => {
    const fromConfig = config?.captureInterval || 60
    setSavedInterval(fromConfig)
    setIntervalInput(String(fromConfig))
  }, [config?.captureInterval])

  // Poll server-side quota every 5 seconds
  useEffect(() => {
    async function fetchQuota() {
      try {
        const res = await fetch(`/api/config/quota?keys=${keys.length}`)
        const data = await res.json()
        setQuotaData(data)
        setLastRefresh(new Date())
      } catch (e) {
        console.error('Quota fetch error:', e)
      }
    }

    if (keys.length > 0) {
      fetchQuota()
      pollRef.current = setInterval(fetchQuota, 5000)
    } else {
      setQuotaData(null)
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [keys.length])

  async function handleSaveInterval() {
    const val = parseInt(intervalInput)
    if (isNaN(val) || val < 30 || val > 600) return
    setSavingInterval(true)
    try {
      await updateCaptureInterval(val)
      // Directly update local state so display reflects immediately
      setSavedInterval(val)
      setIntervalSaved(true)
      setTimeout(() => setIntervalSaved(false), 2000)
    } catch (e) {
      console.error('Save interval error:', e)
    }
    setSavingInterval(false)
  }

  async function handleAddKey() {
    const k = keyInput.trim()
    if (!k || keys.includes(k)) return
    setAdding(true)
    await addApiKey(k)
    setKeyInput('')
    setAdding(false)
  }

  function maskKey(k) { return k.substring(0,8) + '••••••••••••••' + k.slice(-4) }

  function timeAgo(iso) {
    if (!iso) return 'Never'
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 5) return 'Just now'
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    return `${Math.floor(diff/3600)}h ago`
  }

  const totalQuota = keys.length * 10000
  const totalUsed  = quotaData?.totalUsed || 0
  const totalPct   = totalQuota > 0 ? Math.min(100, (totalUsed / totalQuota) * 100) : 0
  const quotaColor = totalPct > 85 ? 'var(--red)' : totalPct > 60 ? 'var(--amber)' : 'var(--green)'
  const activeIdx  = quotaData?.activeKeyIndex ?? -1

  function Cell({ label, value, color, sub }) {
    return (
      <div style={{padding:'14px 16px', borderRight:'1px solid var(--border)'}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--text4)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:4}}>{label}</div>
        <div style={{fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:600, color: color||'var(--text1)', lineHeight:1.1}}>{value}</div>
        {sub && <div style={{fontSize:10, color:'var(--text4)', marginTop:3}}>{sub}</div>}
      </div>
    )
  }

  return (
    <div className="animate-slide-up" style={{display:'flex', flexDirection:'column', gap:20}}>
      {/* pulse keyframe for active badge */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
        @keyframes rrSpin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        @keyframes barGlow { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 8px rgba(10,132,255,.3)} }
      `}</style>

      {/* Page header */}
      <div style={{borderBottom:'1px solid var(--border)', paddingBottom:16}}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:4}}>
          <span style={{
            fontFamily:"'JetBrains Mono',monospace", fontSize:10,
            color:'var(--text3)', letterSpacing:'.12em', textTransform:'uppercase',
          }}>SETUP</span>
          <span style={{color:'var(--border2)'}}>·</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--blue2)', letterSpacing:'.08em'}}>CONFIGURATION</span>
        </div>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10}}>
          <div>
            <h2 style={{
              fontFamily:"'Inter',sans-serif", fontWeight:600,
              fontSize:22, color:'var(--text1)', margin:'0 0 4px',
              letterSpacing:'-0.01em',
            }}>API Configuration</h2>
            <p style={{color:'var(--text3)', fontSize:13, margin:0}}>Manage YouTube Data API v3 keys · Round-robin rotation · Quota resets daily at midnight PT</p>
          </div>
          {lastRefresh && (
            <div style={{display:'flex', alignItems:'center', gap:6}}>
              <span className="live-dot" style={{width:6, height:6}}/>
              <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--text3)'}}>
                Live · Updated {lastRefresh.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Round-Robin Rotation Visualizer ── */}
      {keys.length > 1 && quotaData && (
        <div style={{background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden'}}>
          <div style={{
            padding:'10px 16px',
            borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            background:'var(--bg3)',
          }}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span style={{
                display:'inline-block', width:14, height:14,
                border:'2px solid var(--blue2)', borderTop:'2px solid transparent',
                borderRadius:'50%', animation:'rrSpin 1.5s linear infinite',
              }}/>
              <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:600, color:'var(--text1)', letterSpacing:'.06em', textTransform:'uppercase'}}>
                Round-Robin Rotation
              </span>
            </div>
            <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--text3)'}}>
              Next call → Key #{(activeIdx + 1) || 1}
            </span>
          </div>
          <div style={{padding:'16px', display:'flex', alignItems:'center', justifyContent:'center', gap:0, flexWrap:'wrap'}}>
            {keys.map((k, i) => {
              const kd = quotaData?.perKey?.[i] || {}
              const isActive = kd.status === 'ACTIVE'
              const isExhausted = kd.status === 'EXHAUSTED'
              return (
                <div key={i} style={{display:'flex', alignItems:'center'}}>
                  {/* Key node */}
                  <div style={{
                    width:52, height:52, borderRadius:'50%',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    background: isExhausted
                      ? 'rgba(255,69,58,.1)'
                      : isActive
                        ? 'rgba(48,209,88,.12)'
                        : 'var(--bg3)',
                    border: `2px solid ${isExhausted ? 'var(--red)' : isActive ? 'var(--green)' : 'var(--border)'}`,
                    transition:'all .3s ease',
                    animation: isActive ? 'barGlow 2s ease infinite' : 'none',
                    position:'relative',
                  }}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color: isExhausted ? 'var(--red)' : isActive ? 'var(--green)' : 'var(--text2)'}}>
                      {i+1}
                    </span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:7, color:'var(--text4)', marginTop:1}}>
                      {((kd.used || 0) / 100).toFixed(0)}%
                    </span>
                  </div>
                  {/* Arrow connector */}
                  {i < keys.length - 1 && (
                    <div style={{
                      width:32, height:2, position:'relative',
                      background: 'linear-gradient(90deg, var(--border2), var(--blue2), var(--border2))',
                      margin:'0 2px',
                    }}>
                      <span style={{
                        position:'absolute', right:-4, top:-4,
                        fontSize:10, color:'var(--blue2)',
                      }}>›</span>
                    </div>
                  )}
                  {/* Wrap-around arrow for last key */}
                  {i === keys.length - 1 && keys.length > 1 && (
                    <div style={{
                      marginLeft:8, fontFamily:"'JetBrains Mono',monospace",
                      fontSize:10, color:'var(--text4)',
                    }}>↻</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Quota Overview ── */}
      {keys.length > 0 && (
        <div style={{background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden'}}>
          <div style={{
            padding:'10px 16px',
            borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            background:'var(--bg3)',
          }}>
            <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:600, color:'var(--text2)', letterSpacing:'.08em', textTransform:'uppercase'}}>Today's Quota Usage — Real-Time</span>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:600, color:quotaColor}}>
                <AnimatedNumber value={totalUsed}/> / {totalQuota.toLocaleString()} units
              </span>
              <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--text4)'}}>
                ({totalPct.toFixed(1)}%)
              </span>
            </div>
          </div>
          {/* Master quota bar */}
          <div style={{padding:'10px 16px 0'}}>
            <div style={{height:6, borderRadius:3, background:'var(--bg4)', overflow:'hidden'}}>
              <div style={{
                height:'100%', borderRadius:3,
                background: totalPct > 85
                  ? 'linear-gradient(90deg, var(--amber), var(--red))'
                  : totalPct > 60
                  ? 'linear-gradient(90deg, var(--green), var(--amber))'
                  : 'linear-gradient(90deg, var(--blue), var(--teal))',
                width:`${totalPct}%`,
                transition:'width .6s ease',
              }}/>
            </div>
          </div>
          {/* Per-key usage cards */}
          <div style={{display:'grid', gridTemplateColumns:`repeat(${Math.min(keys.length,4)}, 1fr)`, borderTop:'1px solid var(--border)', marginTop:10}}>
            {keys.map((k, i) => {
              const kd = quotaData?.perKey?.[i] || {}
              const used = kd.used || 0
              const pct  = Math.min(100, (used / 10000) * 100)
              const col  = kd.exhausted ? 'var(--red)' : pct > 85 ? 'var(--red)' : pct > 60 ? 'var(--amber)' : 'var(--teal)'
              return (
                <div key={i} style={{
                  padding:'10px 14px',
                  borderRight: i<keys.length-1?'1px solid var(--border)':'none',
                  borderTop:'1px solid var(--border)',
                  background: kd.status === 'ACTIVE' ? 'rgba(48,209,88,.03)' : 'transparent',
                  transition:'background .3s',
                }}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5}}>
                    <div style={{display:'flex', alignItems:'center', gap:5}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:'var(--text3)', fontWeight:600}}>KEY #{i+1}</span>
                      <StatusBadge status={kd.status || 'STANDBY'}/>
                    </div>
                    <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:col, fontWeight:600}}>
                      <AnimatedNumber value={used}/>
                    </span>
                  </div>
                  <div style={{height:3, borderRadius:2, background:'var(--bg4)', overflow:'hidden'}}>
                    <div style={{
                      height:'100%', borderRadius:2, background:col,
                      width:`${pct}%`, transition:'width .5s ease',
                    }}/>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', marginTop:3}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:'var(--text3)'}}>{pct.toFixed(0)}% used</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:'var(--text3)'}}>{(10000-used).toLocaleString()} left</span>
                  </div>
                  <div style={{marginTop:4}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:'var(--text4)'}}>
                      Last call: {timeAgo(kd.lastCall)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Summary row */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', borderTop:'1px solid var(--border)'}}>
            <Cell label="Total Quota" value={<AnimatedNumber value={totalQuota}/>} sub="units/day total" color="var(--blue2)"/>
            <Cell label="Used Today" value={<AnimatedNumber value={totalUsed}/>} sub="server-tracked" color={quotaColor}/>
            <Cell label="Remaining" value={<AnimatedNumber value={totalQuota - totalUsed}/>} sub="units available" color="var(--text2)"/>
            <div style={{padding:'14px 16px'}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--text4)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:4}}>Capacity</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace", fontSize:18, fontWeight:600, color:'var(--violet)', lineHeight:1.1}}>~{quotaData?.capacityHours || Math.floor((totalQuota - totalUsed) / 660)}h</div>
              <div style={{fontSize:10, color:'var(--text3)', marginTop:3}}>of single-channel capture</div>
            </div>
          </div>
        </div>
      )}

      {/* ── API Keys Card ── */}
      <div style={{background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden'}}>
        <div style={{
          padding:'10px 16px',
          borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'var(--bg3)',
        }}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontSize:14}}>🔑</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:600, color:'var(--text1)', letterSpacing:'.06em', textTransform:'uppercase'}}>YouTube Data API v3 Keys</span>
          </div>
          <span className="badge badge-blue">{keys.length} key{keys.length!==1?'s':''} · round-robin</span>
        </div>

        <div style={{padding:16}}>

          {/* Add key */}
          <div style={{display:'flex', gap:8, marginBottom:16}}>
            <input
              className="input-cyber"
              style={{flex:1}}
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="AIzaSy… (YouTube Data API v3 key)"
              onKeyDown={e => e.key==='Enter' && handleAddKey()}
            />
            <button className="btn btn-blue" onClick={handleAddKey} disabled={adding || !keyInput.trim()}>
              {adding ? '…' : '+ Add Key'}
            </button>
          </div>

          {/* Key list */}
          {!keys.length ? (
            <div style={{
              padding:'24px', textAlign:'center', borderRadius:6,
              background:'var(--bg3)', border:'1px dashed var(--border2)',
            }}>
              <p style={{color:'var(--text3)', fontSize:13}}>No API keys yet. Add your first YouTube Data API v3 key above.</p>
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {keys.map((k, i) => {
                const kd = quotaData?.perKey?.[i] || {}
                const used = kd.used || 0
                const pct  = Math.min(100, (used / 10000) * 100)
                const isActive = kd.status === 'ACTIVE'
                const isExhausted = kd.status === 'EXHAUSTED'
                const col  = isExhausted ? 'var(--red)' : pct > 85 ? 'var(--red)' : pct > 60 ? 'var(--amber)' : 'var(--green)'
                return (
                  <div key={i} style={{
                    padding:'12px 14px', borderRadius:6,
                    background: isActive ? 'rgba(48,209,88,.04)' : 'var(--bg3)',
                    border: isActive
                      ? '1px solid rgba(48,209,88,.25)'
                      : isExhausted
                        ? '1px solid rgba(255,69,58,.2)'
                        : '1px solid var(--border)',
                    animation:`cardIn .3s ease both`, animationDelay:`${i*40}ms`,
                    transition:'border-color .3s, background .3s',
                    opacity: isExhausted ? 0.6 : 1,
                  }}>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      <span style={{
                        fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:600,
                        color: isActive ? 'var(--green)' : 'var(--text4)', width:24,
                      }}>#{i+1}</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:12, flex:1, color:'var(--text2)', letterSpacing:'.02em'}}>
                        {showFull[i] ? k : maskKey(k)}
                      </span>
                      <button className="btn btn-ghost btn-xs" style={{fontSize:12, padding:'2px 7px'}} onClick={() => setShowFull(p=>({...p,[i]:!p[i]}))}>
                        {showFull[i]?'🙈':'👁'}
                      </button>
                      <StatusBadge status={kd.status || 'STANDBY'}/>
                      <button
                        className="btn btn-xs"
                        style={{background:'rgba(255,69,58,.1)', border:'1px solid rgba(255,69,58,.2)', color:'var(--red)'}}
                        onClick={() => removeApiKey(i)}
                      >✕</button>
                    </div>
                    {/* Per-key quota bar */}
                    <div style={{marginTop:10}}>
                      <div style={{display:'flex', justifyContent:'space-between', marginBottom:4}}>
                        <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:'var(--text4)', letterSpacing:'.06em', textTransform:'uppercase'}}>Daily Quota</span>
                        <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:col, fontWeight:600}}>
                          <AnimatedNumber value={used}/> / 10,000 units ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="quota-bar">
                        <div className="quota-fill" style={{width:`${pct}%`, background: isExhausted
                          ? 'var(--red)'
                          : pct > 85 ? 'linear-gradient(90deg,var(--amber),var(--red))'
                          : pct > 60 ? 'linear-gradient(90deg,var(--teal),var(--amber))'
                          : 'linear-gradient(90deg,var(--blue),var(--teal))'
                        }}/>
                      </div>
                      <div style={{display:'flex', justifyContent:'space-between', marginTop:3}}>
                        <span style={{fontSize:10, color:'var(--text3)'}}>
                          Server-tracked · Last call: {timeAgo(kd.lastCall)}
                        </span>
                        <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--text4)'}}>
                          <AnimatedNumber value={10000 - used}/> remaining
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* API cost table */}
        {keys.length > 0 && (
          <div style={{borderTop:'1px solid var(--border)'}}>
            <div style={{
              padding:'8px 16px',
              background:'var(--bg3)',
              fontFamily:"'JetBrains Mono',monospace",
              fontSize:9, fontWeight:600,
              color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase',
            }}>API Cost Breakdown — Per Channel / Hour</div>
            <table className="data-table" style={{width:'100%'}}>
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Frequency</th>
                  <th>Units</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {op:'Stream discovery (search)', freq:'Every 10 min × 6/hr', units:'100 each = 600/hr'},
                  {op:'Viewer count (videos API)', freq:'Every 60 sec × 60/hr', units:'1 each = 60/hr'},
                  {op:'Total per channel / hour',  freq:'—',                   units:'≈ 660 units/hr'},
                ].map(r => (
                  <tr key={r.op}>
                    <td style={{fontWeight:500, color:'var(--text2)'}}>{r.op}</td>
                    <td style={{color:'var(--text3)', fontFamily:"'JetBrains Mono',monospace", fontSize:12}}>{r.freq}</td>
                    <td style={{color:'var(--blue2)', fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:600}}>{r.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Capture Interval Card ── */}
      <div style={{background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden'}}>
        <div style={{
          padding:'10px 16px',
          borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'var(--bg3)',
        }}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontSize:14}}>⏱</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:600, color:'var(--text1)', letterSpacing:'.06em', textTransform:'uppercase'}}>Capture Interval</span>
          </div>
          <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:'var(--teal)', fontWeight:600}}>
            Currently: {currentInterval}s
          </span>
        </div>
        <div style={{padding:16}}>

          <div style={{display:'flex', gap:8, marginBottom:14, alignItems:'center'}}>
            <input
              className="input-cyber"
              type="number"
              min="30"
              max="600"
              step="10"
              value={intervalInput}
              onChange={e => setIntervalInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveInterval()}
              style={{width:120, textAlign:'center'}}
              placeholder="60"
            />
            <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:'var(--text3)'}}>seconds</span>
            <button
              className="btn btn-blue btn-sm"
              onClick={handleSaveInterval}
              disabled={savingInterval || parseInt(intervalInput) === currentInterval || isNaN(parseInt(intervalInput)) || parseInt(intervalInput) < 30 || parseInt(intervalInput) > 600}
            >
              {savingInterval ? '…' : intervalSaved ? '✓ Saved' : 'Save'}
            </button>
          </div>

          {/* Presets */}
          <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:'var(--text4)', letterSpacing:'.06em', textTransform:'uppercase', alignSelf:'center', marginRight:4}}>Presets</span>
            {[30, 60, 90, 120, 180, 300].map(v => (
              <button
                key={v}
                className="btn btn-xs"
                style={parseInt(intervalInput) === v
                  ? {background:'rgba(10,132,255,.18)', border:'1px solid rgba(10,132,255,.4)', color:'var(--blue2)', fontWeight:700}
                  : {background:'transparent', border:'1px solid var(--border)', color:'var(--text3)'}}
                onClick={() => setIntervalInput(String(v))}
              >
                {v}s{v === 60 ? ' (default)' : ''}
              </button>
            ))}
          </div>

          {/* Quota impact info */}
          {keys.length > 0 && (
            <div style={{marginTop:14, padding:'10px 14px', borderRadius:8, background:'rgba(99,102,241,.04)', border:'1px solid rgba(99,102,241,.12)'}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:'var(--text4)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:6}}>Estimated Quota Impact</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                <div>
                  <span style={{fontSize:11, color:'var(--text3)'}}>Per channel/hour: </span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:'var(--blue2)', fontWeight:600}}>
                    ~{Math.ceil(3600 / parseInt(intervalInput || 60)) + Math.ceil(3600 / Math.max(parseInt(intervalInput || 60), 600)) * 100} units
                  </span>
                </div>
                <div>
                  <span style={{fontSize:11, color:'var(--text3)'}}>Max hours ({keys.length} key{keys.length > 1 ? 's' : ''}): </span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:'var(--green)', fontWeight:600}}>
                    ~{Math.floor((keys.length * 10000) / (Math.ceil(3600 / parseInt(intervalInput || 60)) + Math.ceil(3600 / Math.max(parseInt(intervalInput || 60), 600)) * 100))}h
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
