import { useState, useEffect, useRef } from 'react'

const fmtN = n => Number(n||0).toLocaleString('en-IN')

export default function LiveView({ channels, config, getToken }) {
  const [liveData,   setLiveData]   = useState({})
  const [langFilter, setLangFilter] = useState('ALL')
  const [chFilter,   setChFilter]   = useState('ALL')
  const [polling,    setPolling]    = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [expanded,   setExpanded]   = useState({})
  const [quotaWarn,  setQuotaWarn]  = useState(false)
  const pollRef = useRef(null)

  const POLL_MS = 10_000

  // Poll server-side capture status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const token = await getToken()
        if (!token) return
        const res = await fetch('/api/capture/status', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()

        if (data.channels) {
          const newLiveData = {}
          let anyExhausted = false
          for (const [cid, ch] of Object.entries(data.channels)) {
            newLiveData[cid] = {
              viewers: ch.viewers || 0,
              streams: ch.streams || [],
              capturing: ch.capturing || false,
              error: null,
              stale: false,
            }
            // Check if any log mentions quota exhaustion
            if (ch.logs?.some(l => l.includes('⚡') || l.includes('exhausted'))) {
              anyExhausted = true
            }
          }
          setLiveData(newLiveData)
          setQuotaWarn(anyExhausted)
        }
        setLastUpdate(new Date())
      } catch (e) {
        console.error('LiveView status poll error:', e)
      }
    }

    if (polling) {
      fetchStatus()
      pollRef.current = setInterval(fetchStatus, POLL_MS)
    }

    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [polling, getToken])

  function startPolling() { setPolling(true) }
  function stopPolling()  { setPolling(false) }

  const langs   = [...new Set(channels.map(c=>c.language).filter(Boolean))]
  const chNames = [...new Set(channels.map(c=>c.channelName).filter(Boolean))]
  let visible   = channels.filter(c => liveData[c.channelId]?.capturing)
  if (langFilter !== 'ALL') visible = visible.filter(c=>c.language===langFilter)
  if (chFilter   !== 'ALL') visible = visible.filter(c=>c.channelName===chFilter)
  const sorted  = [...visible].sort((a,b)=>(liveData[b.channelId]?.viewers||0)-(liveData[a.channelId]?.viewers||0))
  const totalAll= visible.reduce((s,ch)=>s+(liveData[ch.channelId]?.viewers||0),0)

  const HEADER_H = { fontFamily:"'JetBrains Mono',monospace", fontSize:9, fontWeight:700, color:'var(--text2)', letterSpacing:'.10em', textTransform:'uppercase' }

  return (
    <div className="animate-slide-up" style={{display:'flex',flexDirection:'column',gap:20}}>

      {/* Header */}
      <div style={{borderBottom:'1px solid var(--border)',paddingBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
          <span style={{...HEADER_H,color:'var(--text3)'}}>ANALYTICS</span>
          <span style={{color:'var(--border2)',fontSize:12}}>›</span>
          <span style={{...HEADER_H,color:'var(--red)'}}>LIVE NOW</span>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {polling && <div className="live-ring"><span className="live-dot" style={{width:9,height:9}}/></div>}
            <h2 style={{fontFamily:"'Inter',sans-serif",fontWeight:700,fontSize:24,color:'var(--text1)',margin:0,letterSpacing:'-0.02em'}}>Current LIVE</h2>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {lastUpdate && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'var(--text3)'}}>Updated {lastUpdate.toLocaleTimeString()}</span>}
          </div>
        </div>
      </div>

      {/* Quota warning banner */}
      {quotaWarn && (
        <div style={{background:'rgba(255,214,10,.08)',border:'1px solid rgba(255,214,10,.25)',borderRadius:6,padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
          <span style={{color:'var(--amber)',fontSize:14}}>⚠</span>
          <div>
            <span style={{color:'var(--amber)',fontWeight:600,fontSize:13}}>All API keys quota exhausted</span>
            <span style={{color:'var(--text2)',fontSize:12,marginLeft:8}}>— showing last known data. Resets at midnight PT (≈ 1:30 PM IST)</span>
          </div>
        </div>
      )}

      {/* Summary strip */}
      {visible.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}}>
          {[
            {label:'Total Viewers',      val:fmtN(totalAll), color:'var(--blue2)'},
            {label:'Live Channels',      val:sorted.filter(ch=>(liveData[ch.channelId]?.streams||[]).length>0).length, color:'var(--green)'},
            {label:'Channels Monitored', val:visible.length, color:'var(--text1)'},
          ].map((s,i)=>(
            <div key={s.label} style={{padding:'14px 20px',borderRight:i<2?'1px solid var(--border)':'none'}}>
              <div style={{...HEADER_H,marginBottom:5}}>{s.label}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:26,fontWeight:700,color:s.color,lineHeight:1,letterSpacing:'-0.02em'}}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {channels.length > 0 && (
        <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 16px',display:'flex',flexWrap:'wrap',gap:14,alignItems:'center'}}>
          <div style={{display:'flex',flexWrap:'wrap',gap:5,alignItems:'center'}}>
            <span style={{...HEADER_H,color:'var(--text3)'}}>LANG</span>
            {['ALL',...langs].map(l=>(
              <button key={l} onClick={()=>setLangFilter(l)} className="btn btn-xs"
                style={langFilter===l?{background:'rgba(10,132,255,.18)',border:'1px solid rgba(10,132,255,.4)',color:'var(--blue2)',fontWeight:700}:{background:'transparent',border:'1px solid var(--border)',color:'var(--text2)'}}>
                {l==='ALL'?'All':l}
              </button>
            ))}
          </div>
          <div style={{width:1,height:18,background:'var(--border)'}}/>
          <div style={{display:'flex',flexWrap:'wrap',gap:5,alignItems:'center'}}>
            <span style={{...HEADER_H,color:'var(--text3)'}}>CHANNEL</span>
            {['ALL',...chNames].map(n=>(
              <button key={n} onClick={()=>setChFilter(n)} className="btn btn-xs"
                style={chFilter===n?{background:'rgba(255,69,58,.15)',border:'1px solid rgba(255,69,58,.4)',color:'var(--red)',fontWeight:700}:{background:'transparent',border:'1px solid var(--border)',color:'var(--text2)'}}>
                {n==='ALL'?'All':n}
              </button>
            ))}
          </div>
        </div>
      )}

      {!channels.length && (
        <div style={{background:'var(--bg2)',border:'1px dashed var(--border2)',borderRadius:8,padding:'48px',textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:10,opacity:.25}}>●</div>
          <h3 style={{fontFamily:"'Inter',sans-serif",fontWeight:600,fontSize:16,color:'var(--text2)',marginBottom:6}}>Nothing to monitor</h3>
          <p style={{color:'var(--text3)',fontSize:13}}>Add channels in the Channels screen first.</p>
        </div>
      )}

      {/* Table */}
      {sorted.length > 0 && (
        <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}}>
          {/* Column headers */}
          <div style={{display:'grid',gridTemplateColumns:'52px 1fr 100px 160px 28px',padding:'8px 16px',background:'var(--bg3)',borderBottom:'1px solid var(--border)'}}>
            {['#','Channel','Streams','Viewers',''].map((h,i)=>(
              <div key={i} style={{...HEADER_H,textAlign:i>=3?'right':'left',color:'var(--text2)'}}>{h}</div>
            ))}
          </div>

          {sorted.map((ch,i)=>{
            const d       = liveData[ch.channelId] || {}
            const viewers = d.viewers || 0
            const streams = d.streams || []
            const isExp   = expanded[ch.channelId]
            const pct     = totalAll>0 ? (viewers/totalAll*100) : 0
            const rankCls = i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':''
            
            const ROW_COLORS = [
              'var(--amber)',
              'rgba(180,184,196,.7)',
              'var(--blue2)',
              'var(--pink)',
              'var(--green)',
              'var(--teal)',
              'var(--violet)',
              'var(--cyan)'
            ]
            const barColor = ROW_COLORS[i % ROW_COLORS.length]

            return (
              <div key={ch.channelId} className={`animate-slide-up ${rankCls}`}
                   style={{animationDelay:`${i*20}ms`,borderBottom:i<sorted.length-1?'1px solid var(--border)':'none'}}>
                {/* Main row */}
                <div
                  style={{display:'grid',gridTemplateColumns:'52px 1fr 100px 160px 28px',padding:'12px 16px',alignItems:'center',cursor: streams.length>0?'pointer':'default',transition:'background .12s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  onClick={()=>streams.length>0&&setExpanded(p=>({...p,[ch.channelId]:!p[ch.channelId]}))}
                >
                  {/* Rank */}
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:700,color:'var(--text3)'}}>{i+1}</div>

                  {/* Channel */}
                  <div style={{minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5}}>
                      {streams.length>0&&<span className="live-dot" style={{width:6,height:6,flexShrink:0}}/>}
                      {d.stale&&<span title="Quota exhausted — last known data" style={{fontSize:10,color:'var(--amber)',flexShrink:0}}>⚡</span>}
                      <span style={{fontFamily:"'Inter',sans-serif",fontWeight:600,fontSize:14,color:'var(--text1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ch.channelName}</span>
                      <span className="badge badge-violet" style={{fontSize:9,flexShrink:0}}>{ch.language}</span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{flex:1,height:3,borderRadius:2,background:'var(--bg4)',overflow:'hidden',maxWidth:260}}>
                        <div style={{height:'100%',borderRadius:2,background:barColor,width:`${pct}%`,transition:'width .6s ease'}}/>
                      </div>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'var(--text3)',minWidth:36}}>{pct.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Streams count */}
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:600,color:streams.length>0?'var(--green)':'var(--text3)'}}>
                    {streams.length} live
                  </div>

                  {/* Viewers */}
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:viewers>999999?20:viewers>99999?22:26,color:viewers>0?'var(--blue2)':'var(--text3)',lineHeight:1,letterSpacing:'-0.02em'}}>
                      {fmtN(viewers)}
                    </div>
                    <div style={{fontSize:10,color:'var(--text3)',fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>viewers</div>
                  </div>

                  {/* Expand */}
                  <div style={{textAlign:'right',color:'var(--text2)',fontSize:11,fontWeight:700}}>
                    {streams.length>0?(isExp?'▲':'▼'):''}
                  </div>
                </div>

                {/* Expanded stream list WITH titles */}
                {isExp&&streams.length>0&&(
                  <div className="animate-fade-in" style={{borderTop:'1px solid var(--border)',background:'var(--bg)'}}>
                    {/* Sub-header */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 120px',padding:'6px 16px 6px 68px',background:'var(--bg3)',borderBottom:'1px solid var(--border)'}}>
                      <div style={{...HEADER_H,color:'var(--text3)'}}>Stream Title</div>
                      <div style={{...HEADER_H,color:'var(--text3)',textAlign:'right'}}>Viewers</div>
                    </div>
                    {streams.map((s,si)=>(
                      <div key={s.id} style={{display:'grid',gridTemplateColumns:'1fr 120px',padding:'8px 16px 8px 68px',borderBottom:si<streams.length-1?'1px solid var(--border)':'none',transition:'background .12s'}}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--bg3)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
                          <span className="live-dot" style={{width:4,height:4,flexShrink:0}}/>
                          <span style={{fontSize:13,fontWeight:500,color:'var(--text1)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.title||<span style={{color:'var(--text3)',fontStyle:'italic'}}>Live stream</span>}</span>
                        </div>
                        <div style={{textAlign:'right',fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:700,color:'var(--blue2)'}}>{fmtN(s.views||0)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {d.error&&!d.stale&&(
                  <div style={{padding:'6px 16px 8px 68px',fontSize:11,color:'var(--red)',fontFamily:"'JetBrains Mono',monospace"}}>⚠ {d.error}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!(config?.apiKeys?.length)&&(
        <div style={{background:'rgba(255,214,10,.07)',border:'1px solid rgba(255,214,10,.2)',borderRadius:8,padding:'12px 16px'}}>
          <span style={{color:'var(--amber)',fontSize:13,fontWeight:600}}>⚠ Add YouTube API keys in Configuration to enable live polling</span>
        </div>
      )}
    </div>
  )
}
