import { useState, useEffect, useRef, useCallback } from 'react'
import AddChannelModal from '../AddChannelModal'

const fmtN = n => Number(n || 0).toLocaleString('en-IN')

// Removed ScheduleModal in favor of global schedule

export default function ChannelsView({ channels, config, updateGlobalSchedule, addChannel, removeChannel, updateChannel, user, getToken }) {
  const uid = user?.uid

  const globalSchedule = config?.globalSchedule || { enabled: false, startHour: 9, endHour: 23 }

  const [showModal, setShowModal] = useState(false)
  const [langFilter, setLangFilter] = useState('ALL')
  const [captureData, setCaptureData] = useState({})  // channelId -> { capturing, viewers, streams, logs }
  const [selected, setSelected] = useState(new Set())
  const [expandedLogs, setExpandedLogs] = useState({})
  const [engineRunning, setEngineRunning] = useState(false)

  const pollRef = useRef(null)

  // Poll server-side capture status every 5 seconds
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
          setCaptureData(data.channels)
        }
        setEngineRunning(data.engineRunning || false)
      } catch (e) {
        console.error('Status poll error:', e)
      }
    }

    fetchStatus()
    pollRef.current = setInterval(fetchStatus, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [getToken])

  // Removed localStorage globalSchedule code here

  async function startCapture(channelId) {
    try {
      const token = await getToken()
      await fetch('/api/capture/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channelId }),
      })
      // Optimistic update
      setCaptureData(prev => ({
        ...prev,
        [channelId]: { ...(prev[channelId] || {}), capturing: true },
      }))
    } catch (e) {
      console.error('Start capture error:', e)
    }
  }

  async function stopCapture(channelId) {
    try {
      const token = await getToken()
      await fetch('/api/capture/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channelId }),
      })
      setCaptureData(prev => ({
        ...prev,
        [channelId]: { ...(prev[channelId] || {}), capturing: false },
      }))
    } catch (e) {
      console.error('Stop capture error:', e)
    }
  }

  async function startAll() {
    try {
      const token = await getToken()
      const ids = visible.map(ch => ch.channelId)
      await fetch('/api/capture/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channelIds: ids }),
      })
      setCaptureData(prev => {
        const next = { ...prev }
        ids.forEach(id => { next[id] = { ...(next[id] || {}), capturing: true } })
        return next
      })
    } catch (e) {
      console.error('Start all error:', e)
    }
  }

  async function stopAll() {
    try {
      const token = await getToken()
      await fetch('/api/capture/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ all: true }),
      })
      setCaptureData(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(id => { next[id] = { ...next[id], capturing: false } })
        return next
      })
    } catch (e) {
      console.error('Stop all error:', e)
    }
  }

  async function startSelected() {
    try {
      const token = await getToken()
      const ids = [...selected].filter(id => !captureData[id]?.capturing)
      if (!ids.length) return
      await fetch('/api/capture/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channelIds: ids }),
      })
      setCaptureData(prev => {
        const next = { ...prev }
        ids.forEach(id => { next[id] = { ...(next[id] || {}), capturing: true } })
        return next
      })
    } catch (e) {
      console.error('Start selected error:', e)
    }
  }

  async function stopSelected() {
    try {
      const token = await getToken()
      const ids = [...selected].filter(id => captureData[id]?.capturing)
      if (!ids.length) return
      await fetch('/api/capture/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channelIds: ids }),
      })
      setCaptureData(prev => {
        const next = { ...prev }
        ids.forEach(id => { next[id] = { ...next[id], capturing: false } })
        return next
      })
    } catch (e) {
      console.error('Stop selected error:', e)
    }
  }

  const langs = [...new Set(channels.map(c => c.language).filter(Boolean))]
  let visible = channels
  if (langFilter !== 'ALL') visible = visible.filter(c => c.language === langFilter)

  const currentHour = new Date().getHours()
  const isWithinSchedule = !globalSchedule.enabled ||
    (globalSchedule.startHour < globalSchedule.endHour
      ? currentHour >= globalSchedule.startHour && currentHour < globalSchedule.endHour
      : globalSchedule.startHour > globalSchedule.endHour
        ? currentHour >= globalSchedule.startHour || currentHour < globalSchedule.endHour
        : true)

  const capCount = visible.filter(ch => {
    const cap = captureData[ch.channelId]?.capturing || false;
    const chUseSchedule = ch.useGlobalSchedule ?? true;
    const scheduledButPaused = cap && globalSchedule.enabled && chUseSchedule && !isWithinSchedule;
    return cap && !scheduledButPaused;
  }).length
  const allChecked = visible.length > 0 && visible.every(ch => selected.has(ch.channelId))

  function toggleAll() {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(visible.map(c => c.channelId)))
  }
  function toggleOne(cid) {
    const next = new Set(selected)
    next.has(cid) ? next.delete(cid) : next.add(cid)
    setSelected(next)
  }

  const MONO = { fontFamily: "'JetBrains Mono',monospace" }
  const LABEL = { fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.10em', textTransform: 'uppercase', color: 'var(--text3)' }

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text4)' }}>SETUP</span>
          <span style={{ color: 'var(--border2)', fontSize: 12 }}>›</span>
          <span style={{ ...MONO, fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--blue2)' }}>CHANNELS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <h2 style={{ fontWeight: 800, fontSize: 26, color: 'var(--text1)', margin: 0, letterSpacing: '-0.025em' }}>
                Channels
              </h2>
              {capCount > 0 && <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}><span className="live-dot" style={{ width: 5, height: 5 }} />{capCount} capturing</span>}
              {engineRunning && <span className="badge badge-blue" style={{ fontSize: 10 }}>⚙ Server Engine</span>}
            </div>
          </div>
          <button className="btn btn-blue" style={{ fontWeight: 700 }} onClick={() => setShowModal(true)}>+ Add Channel</button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {[
          { label: 'Total Channels', val: channels.length, color: 'var(--blue2)' },
          { label: 'Capturing Now', val: `${capCount} / ${channels.length}`, color: 'var(--green)' },
          { label: 'Languages', val: langs.length, color: 'var(--text1)' },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: '16px 22px', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ ...LABEL, marginBottom: 6 }}>{s.label}</div>
            <div style={{ ...MONO, fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1, letterSpacing: '-0.03em' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Global Scheduler */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 22px', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ ...LABEL, marginBottom: 6 }}>GLOBAL SCHEDULER</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => updateGlobalSchedule({ ...globalSchedule, enabled: !globalSchedule.enabled })} style={{
              width: 40, height: 22, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: globalSchedule.enabled ? 'var(--green)' : 'var(--bg4)',
              position: 'relative', transition: 'background .25s', flexShrink: 0,
            }}>
              <span style={{ position: 'absolute', top: 2, left: globalSchedule.enabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .25s', boxShadow: '0 2px 4px rgba(0,0,0,.3)' }} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{globalSchedule.enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>

        {globalSchedule.enabled && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>Start:</span>
              <select className="select-cyber" style={{ padding: '4px 8px', fontSize: 12, minWidth: 70 }} value={globalSchedule.startHour} onChange={e => updateGlobalSchedule({ ...globalSchedule, startHour: +e.target.value })}>
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{`${String(i).padStart(2, '0')}:00`}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600 }}>End:</span>
              <select className="select-cyber" style={{ padding: '4px 8px', fontSize: 12, minWidth: 70 }} value={globalSchedule.endHour} onChange={e => updateGlobalSchedule({ ...globalSchedule, endHour: +e.target.value })}>
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{`${String(i).padStart(2, '0')}:00`}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      {channels.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 18px', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ ...LABEL, color: 'var(--text4)' }}>LANG</span>
            {['ALL', ...langs].map(l => (
              <button key={l} onClick={() => setLangFilter(l)} className="btn btn-xs"
                style={langFilter === l ? { background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.3)', color: 'var(--blue2)', fontWeight: 700 } : { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text3)' }}>
                {l === 'ALL' ? 'All' : l}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {selected.size > 0 && (
              <>
                <span style={{ ...MONO, fontSize: 11, color: 'var(--text3)' }}>{selected.size} selected</span>
                <button className="btn btn-green btn-xs" onClick={startSelected}>▶ Start</button>
                <button className="btn btn-ghost btn-xs" onClick={stopSelected}>■ Stop</button>
                <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
              </>
            )}
            <button className="btn btn-green btn-xs" onClick={startAll}>▶ All</button>
            <button className="btn btn-ghost btn-xs" onClick={stopAll}>■ All</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {visible.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px dashed var(--border2)', borderRadius: 12, padding: '56px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12, opacity: .2 }}>📡</div>
          <h3 style={{ fontWeight: 700, fontSize: 17, color: 'var(--text2)', marginBottom: 8 }}>No channels yet</h3>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 22 }}>Add your first YouTube channel to start monitoring.</p>
          <button className="btn btn-blue" onClick={() => setShowModal(true)}>+ Add First Channel</button>
        </div>
      ) : (
        /* LIST VIEW */
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* List header */}
          <div style={{ display: 'grid', gridTemplateColumns: '36px 36px 1fr 120px 90px 100px 90px 100px', padding: '10px 18px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <div>
              <input type="checkbox" checked={allChecked} onChange={toggleAll} style={{ cursor: 'pointer' }} />
            </div>
            <div />
            <div style={{ ...LABEL }}>Channel</div>
            <div style={{ ...LABEL }}>Viewers</div>
            <div style={{ ...LABEL }}>Streams</div>
            <div style={{ ...LABEL }}>Status</div>
            <div style={{ ...LABEL, textAlign: 'center' }}>Recurring</div>
            <div style={{ ...LABEL, textAlign: 'right' }}>Actions</div>
          </div>

          {visible.map((ch, i) => {
            const d = captureData[ch.channelId] || {}
            const viewers = d.viewers || 0
            const streams = d.streams || []
            const logs = d.logs || []
            const cap = d.capturing || false
            const isLogExp = expandedLogs[ch.channelId]
            const isSel = selected.has(ch.channelId)

            const chUseSchedule = ch.useGlobalSchedule ?? true
            const scheduledButPaused = cap && globalSchedule.enabled && chUseSchedule && !isWithinSchedule


            return (
              <div key={ch.id || ch.channelId} className="animate-slide-up" style={{ animationDelay: `${i * 25}ms`, borderBottom: i < visible.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '36px 36px 1fr 120px 90px 100px 90px 100px', padding: '13px 18px', alignItems: 'center', transition: 'background .15s', cursor: 'default' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  <div><input type="checkbox" checked={isSel} onChange={() => toggleOne(ch.channelId)} style={{ cursor: 'pointer' }} /></div>

                  <div>{cap && !scheduledButPaused && streams.length > 0 ? <div className="live-ring"><span className="live-dot" style={{ width: 7, height: 7 }} /></div> : <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--bg4)', display: 'inline-block' }} />}</div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.channelName}</span>
                      <span className="badge badge-violet" style={{ fontSize: 9, flexShrink: 0 }}>{ch.language}</span>
                      <span className="badge badge-blue" style={{ fontSize: 9, flexShrink: 0 }}>{ch.colName}</span>
                    </div>
                    <div style={{ ...MONO, fontSize: 10, color: 'var(--text4)' }}>{ch.channelId}</div>
                  </div>

                  <div>
                    <div style={{ ...MONO, fontSize: 22, fontWeight: 700, color: cap && viewers > 0 ? 'var(--blue2)' : viewers > 0 ? 'var(--text2)' : 'var(--text4)', lineHeight: 1, letterSpacing: '-0.03em' }}>{fmtN(viewers)}</div>
                    <div style={{ ...MONO, fontSize: 10, color: 'var(--text4)', marginTop: 3 }}>{streams.length} stream{streams.length !== 1 ? 's' : ''}</div>
                  </div>

                  <div style={{ ...MONO, fontSize: 12, fontWeight: 600, color: streams.length > 0 ? 'var(--green)' : 'var(--text4)' }}>{streams.length} live</div>

                  <div>
                    {scheduledButPaused
                      ? <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 5 }}>⏸ Idle (Scheduled)</span>
                      : cap
                        ? <span style={{ ...MONO, fontSize: 10, fontWeight: 700, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} /> Capturing</span>
                        : <span style={{ ...MONO, fontSize: 10, color: 'var(--text4)' }}>Idle</span>}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <input type="checkbox" checked={ch.useGlobalSchedule ?? true} onChange={(e) => updateChannel(ch.id, { useGlobalSchedule: e.target.checked })} style={{ cursor: 'pointer' }} title="Use Global Schedule" />
                  </div>

                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {(() => {
                      const iconBtn = { width: 26, height: 26, padding: 0, justifyContent: 'center' }
                      return (
                        <>
                          {cap
                            ? <button className="btn btn-ghost btn-xs" title="Stop" onClick={() => stopCapture(ch.channelId)} style={{ ...iconBtn, color: 'var(--text2)', borderColor: 'var(--border)' }}>■</button>
                            : <button className="btn btn-green btn-xs" title="Start" onClick={() => startCapture(ch.channelId)} style={iconBtn}>▶</button>}
                          <button className="btn btn-ghost btn-xs" title="Log" onClick={() => setExpandedLogs(p => ({ ...p, [ch.channelId]: !p[ch.channelId] }))} style={{ ...iconBtn, color: 'var(--text3)' }}>{isLogExp ? '▲' : '▼'}</button>
                          <button className="btn btn-ghost btn-xs" title="Remove" onClick={() => removeChannel(ch.id)} style={{ ...iconBtn, color: 'var(--red)', borderColor: 'var(--border)' }}>✕</button>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Log row */}
                {isLogExp && (
                  <div className="animate-fade-in" style={{ padding: '10px 18px 12px 90px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <div className="log-box">
                      {logs.length === 0
                        ? <span style={{ color: 'var(--text4)' }}>Waiting to capture…</span>
                        : logs.map((l, li) => {
                          const cls = l.includes('✅') ? 'log-ok' : l.includes('❌') ? 'log-err' : l.includes('⚠') ? 'log-warn' : 'log-info'
                          return <div key={li} className={cls}>{l}</div>
                        })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <AddChannelModal apiKeys={config?.apiKeys || []} onAdd={addChannel} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
