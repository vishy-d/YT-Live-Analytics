import { useState, useEffect, useRef, useCallback } from 'react'
import ChannelCard from '../ChannelCard'
import AddChannelModal from '../AddChannelModal'

const DISCOVERY_TTL  = 10 * 60 * 1000  // 10 min
const CAPTURE_MS     = 60 * 1000        // 60 sec

export default function ChannelsView({ channels, config, addChannel, removeChannel, user, getToken }) {
  const [showModal,  setShowModal]  = useState(false)
  const [langFilter, setLangFilter] = useState('ALL')
  const [liveData,   setLiveData]   = useState({})   // channelId -> {viewers, streams, log, capturing, discCache, discTime}
  const captureRefs = useRef({})  // channelId -> {timeout, interval}

  const apiKeys  = config?.apiKeys || []
  const apiIndex = useRef(0)

  function getKey() {
    if (!apiKeys.length) throw new Error('No API keys configured')
    const k = apiKeys[apiIndex.current % apiKeys.length]
    apiIndex.current = (apiIndex.current + 1) % apiKeys.length
    return k
  }

  // Init liveData for any new channels
  useEffect(() => {
    setLiveData(prev => {
      const next = { ...prev }
      channels.forEach(ch => {
        if (!next[ch.channelId]) {
          next[ch.channelId] = { viewers:0, streams:[], log:[], capturing:false, discCache:[], discTime:0 }
        }
      })
      // Remove deleted channels
      Object.keys(next).forEach(id => {
        if (!channels.find(c => c.channelId===id)) delete next[id]
      })
      return next
    })
  }, [channels])

  const addLog = useCallback((channelId, msg) => {
    setLiveData(prev => {
      const d = prev[channelId] || { viewers:0, streams:[], log:[], capturing:false, discCache:[], discTime:0 }
      const log = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...d.log].slice(0, 30)
      return { ...prev, [channelId]: { ...d, log } }
    })
  }, [])

  async function fetchLiveData(channelId, skipDiscovery = false) {
    const ch = channels.find(c => c.channelId === channelId)
    if (!ch) return
    const d = liveData[channelId] || { discCache:[], discTime:0 }
    const now = Date.now()
    const doDiscovery = !skipDiscovery || !d.discCache?.length || now - d.discTime > DISCOVERY_TTL

    try {
      const apiKey = getKey()
      const res = await fetch('/api/youtube/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          apiKey,
          skipDiscovery: !doDiscovery,
          cachedIds: d.discCache?.map(s => s.id) || [],
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setLiveData(prev => {
        const existing = prev[channelId] || {}
        return {
          ...prev,
          [channelId]: {
            ...existing,
            viewers:  data.total,
            streams:  data.streams,
            discCache: data.streams,
            discTime:  doDiscovery ? now : existing.discTime,
          }
        }
      })

      return data
    } catch (e) {
      addLog(channelId, `❌ ${e.message}`)
      throw e
    }
  }

  async function captureOnce(channelId) {
    const ch = channels.find(c => c.channelId === channelId)
    if (!ch) return

    try {
      const data = await fetchLiveData(channelId, true)
      if (!data) return

      if (!data.streams.length) {
        addLog(channelId, '⚠ No live streams right now')
        return
      }

      // Save to Firestore via API route
      const token = await getToken()
      if (token) {
        await fetch('/api/analytics/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            channelId: ch.channelId,
            channelName: ch.channelName,
            language: ch.language,
            colName: ch.colName,
            viewers: data.total,
            streams: data.streams,
            timestamp: new Date().toISOString(),
          }),
        })
      }

      addLog(channelId, `✅ ${data.total.toLocaleString()} viewers saved`)
    } catch (e) {
      addLog(channelId, `❌ ${e.message}`)
    }
  }

  function startCapture(channelId) {
    if (captureRefs.current[channelId]) return

    setLiveData(prev => ({
      ...prev,
      [channelId]: { ...(prev[channelId]||{}), capturing: true }
    }))

    const now = Date.now()
    const msToNext = CAPTURE_MS - (now % CAPTURE_MS)
    addLog(channelId, `⏳ Starting in ${Math.round(msToNext/1000)}s`)

    const timeout = setTimeout(() => {
      captureOnce(channelId)
      const interval = setInterval(() => captureOnce(channelId), CAPTURE_MS)
      captureRefs.current[channelId] = { interval }
    }, msToNext)

    captureRefs.current[channelId] = { timeout }
  }

  function stopCapture(channelId) {
    const refs = captureRefs.current[channelId]
    if (refs) {
      clearTimeout(refs.timeout)
      clearInterval(refs.interval)
      delete captureRefs.current[channelId]
    }
    setLiveData(prev => ({
      ...prev,
      [channelId]: { ...(prev[channelId]||{}), capturing: false }
    }))
    addLog(channelId, '■ Capture stopped')
  }

  async function refreshChannel(channelId) {
    addLog(channelId, '🔄 Refreshing…')
    try { await fetchLiveData(channelId, false) }
    catch (_) {}
  }

  function startAll() {
    const visible = langFilter==='ALL' ? channels : channels.filter(c=>c.language===langFilter)
    visible.forEach(ch => { if (!liveData[ch.channelId]?.capturing) startCapture(ch.channelId) })
  }
  function stopAll() {
    const visible = langFilter==='ALL' ? channels : channels.filter(c=>c.language===langFilter)
    visible.forEach(ch => { if (liveData[ch.channelId]?.capturing) stopCapture(ch.channelId) })
  }

  const langs    = [...new Set(channels.map(c => c.language).filter(Boolean))]
  const visible  = langFilter==='ALL' ? channels : channels.filter(c=>c.language===langFilter)
  const capCount = Object.values(liveData).filter(d=>d.capturing).length
  const totalV   = Object.values(liveData).reduce((s,d)=>s+(d.viewers||0),0)
  const liveStr  = Object.values(liveData).reduce((s,d)=>s+(d.streams?.length||0),0)

  function fmtNum(n) {
    if (n>=1e6) return (n/1e6).toFixed(1)+'M'
    if (n>=1e3) return (n/1e3).toFixed(0)+'K'
    return n.toLocaleString()
  }

  return (
    <div className="animate-slide-up space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span style={{color:'#ff2d55',fontSize:22}}>📡</span>
            <h2 className="font-display text-2xl font-bold text-white">Channel List</h2>
            {capCount > 0 && (
              <span className="flex items-center gap-1.5 badge badge-green">
                <span className="live-dot" style={{width:6,height:6}}/>
                {capCount} LIVE
              </span>
            )}
          </div>
          <p style={{color:'#2a4a6a',fontSize:13}}>Monitor, start/stop captures, view real-time counts</p>
        </div>
        <button className="btn btn-red" onClick={() => setShowModal(true)}>
          ＋ Add Channel
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label:'Channels',  val:channels.length,   color:'#00d4ff' },
          { label:'Live Streams', val:liveStr,         color:'#ff2d55' },
          { label:'Total Viewers', val:fmtNum(totalV), color:'#10ff9a' },
          { label:'Capturing', val:`${capCount}/${channels.length}`, color:'#ffb700' },
        ].map(s => (
          <div key={s.label} className="glass p-4 stat-card rounded-2xl" style={{'--accent':s.color}}>
            <div className="big-num text-3xl" style={{color:s.color}}>{s.val}</div>
            <div className="text-xs mt-1" style={{color:'#2a4a6a',textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      {channels.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <button className="btn btn-green btn-sm" onClick={startAll}>▶ Start {langFilter!=='ALL'?langFilter:'All'}</button>
          <button className="btn btn-ghost btn-sm" onClick={stopAll}>■ Stop {langFilter!=='ALL'?langFilter:'All'}</button>
          <div className="flex-1"/>
          {/* Language filter pills */}
          {langs.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {['ALL',...langs].map(l => (
                <button key={l} onClick={() => setLangFilter(l)}
                        className="btn btn-xs rounded-lg"
                        style={langFilter===l
                          ? {background:'rgba(0,212,255,0.15)',border:'1px solid rgba(0,212,255,0.4)',color:'#00d4ff'}
                          : {background:'rgba(0,212,255,0.04)',border:'1px solid rgba(0,212,255,0.08)',color:'#4a6080'}}>
                  {l === 'ALL' ? '🌐 All' : l}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cards grid */}
      {visible.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center"
             style={{border:'1px dashed rgba(0,212,255,0.1)'}}>
          <div style={{fontSize:48,marginBottom:12}}>📡</div>
          <h3 className="font-display text-lg font-semibold text-white mb-2">No channels yet</h3>
          <p style={{color:'#2a4a6a',fontSize:13,marginBottom:20}}>
            Add your first YouTube channel to start monitoring live viewer counts.
          </p>
          <button className="btn btn-red" onClick={() => setShowModal(true)}>＋ Add First Channel</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {visible.map((ch, i) => {
            const d = liveData[ch.channelId] || {}
            return (
              <ChannelCard
                key={ch.firestoreId || ch.channelId}
                index={i}
                ch={{ ...ch, ...d }}
                onStart={startCapture}
                onStop={stopCapture}
                onRemove={removeChannel}
                onRefresh={refreshChannel}
              />
            )
          })}
        </div>
      )}

      {showModal && (
        <AddChannelModal
          apiKeys={apiKeys}
          onAdd={addChannel}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
