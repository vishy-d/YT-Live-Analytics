import { useState } from 'react'

export default function AddChannelModal({ apiKeys, onAdd, onClose }) {
  const [url,        setUrl]        = useState('')
  const [step,       setStep]       = useState(1)
  const [resolving,  setResolving]  = useState(false)
  const [resolved,   setResolved]   = useState(null)
  const [error,      setError]      = useState('')
  const [language,   setLanguage]   = useState('')
  const [newLang,    setNewLang]    = useState('')
  const [colName,    setColName]    = useState('')
  const [adding,     setAdding]     = useState(false)
  const [existLangs] = useState(['Hindi','Telugu','Tamil','Kannada','Bengali','Marathi','English'])

  const apiKey = apiKeys[0]

  async function resolve() {
    if (!url.trim() || !apiKey) return
    setResolving(true); setError('')
    try {
      const res = await fetch('/api/youtube/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), apiKey }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResolved(data)
      setColName(data.name)
      setStep(2)
    } catch (e) {
      setError(e.message)
    }
    setResolving(false)
  }

  async function confirm() {
    const lang = language || newLang.trim()
    if (!lang) { setError('Select or type a language sheet name'); return }
    if (!colName.trim()) { setError('Enter a column/display name'); return }
    setAdding(true)
    try {
      await onAdd({
        channelId:   resolved.id,
        channelName: resolved.name,
        language:    lang,
        colName:     colName.trim(),
      })
      onClose()
    } catch (e) { setError(e.message) }
    setAdding(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-xl font-bold text-white">Add YouTube Channel</h3>
            <div className="flex gap-2 mt-2">
              {[1,2].map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                       style={{background: step>=s ? 'rgba(0,212,255,0.2)' : 'rgba(0,212,255,0.05)',
                               border: `1px solid ${step>=s ? 'rgba(0,212,255,0.4)' : 'rgba(0,212,255,0.1)'}`,
                               color: step>=s ? '#00d4ff' : '#1e3a5f'}}>
                    {s}
                  </div>
                  {s<2 && <div className="w-8 h-px" style={{background:step>s?'rgba(0,212,255,0.3)':'rgba(0,212,255,0.1)'}}/>}
                </div>
              ))}
              <span className="text-xs ml-1" style={{color:'#2a4a6a'}}>
                {step===1 ? 'Resolve channel' : 'Assign & configure'}
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕</button>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono mb-2" style={{color:'#4a6080',letterSpacing:'0.06em'}}>YOUTUBE CHANNEL URL</label>
              <input className="input-cyber" value={url} onChange={e => setUrl(e.target.value)}
                     placeholder="https://youtube.com/@ChannelName"
                     onKeyDown={e => e.key==='Enter' && resolve()}/>
              <p className="text-xs mt-1.5" style={{color:'#1e3a5f'}}>
                Supports: @handle · /channel/UC… · /c/name
              </p>
            </div>

            {!apiKey && (
              <div className="rounded-xl px-4 py-3 text-xs" style={{background:'rgba(255,183,0,0.08)',border:'1px solid rgba(255,183,0,0.2)',color:'#ffb700'}}>
                ⚠ Add at least one YouTube API key in Config first
              </div>
            )}

            {error && <div className="rounded-xl px-4 py-3 text-xs" style={{background:'rgba(255,45,85,0.08)',border:'1px solid rgba(255,45,85,0.2)',color:'#ff6b85'}}>⚠ {error}</div>}

            <div className="flex gap-3 justify-end">
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-cyan" onClick={resolve} disabled={resolving || !url.trim() || !apiKey}>
                {resolving ? <><span className="live-dot live-dot-cyan" style={{width:6,height:6}}/>Resolving…</> : 'Resolve →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && resolved && (
          <div className="space-y-4">

            {/* Channel info */}
            <div className="rounded-xl p-4" style={{background:'rgba(0,212,255,0.05)',border:'1px solid rgba(0,212,255,0.12)'}}>
              <div className="font-display font-bold text-white text-lg">{resolved.name}</div>
              <div className="font-mono text-xs mt-0.5" style={{color:'#2a4a6a'}}>{resolved.id}</div>
              <div className="flex items-center gap-2 mt-2">
                {resolved.streams?.length > 0 ? (
                  <><span className="live-dot" style={{width:6,height:6}}/><span className="text-xs neon-green">{resolved.streams.length} stream(s) live now</span></>
                ) : (
                  <span className="text-xs" style={{color:'#2a4a6a'}}>No live streams right now</span>
                )}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="block text-xs font-mono mb-2" style={{color:'#4a6080',letterSpacing:'0.06em'}}>LANGUAGE / SHEET</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {existLangs.map(l => (
                  <button key={l} onClick={() => { setLanguage(l); setNewLang('') }}
                          className="btn btn-xs rounded-lg"
                          style={language===l
                            ? {background:'rgba(0,212,255,0.15)',border:'1px solid rgba(0,212,255,0.4)',color:'#00d4ff'}
                            : {background:'rgba(0,212,255,0.04)',border:'1px solid rgba(0,212,255,0.1)',color:'#4a6080'}}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input-cyber flex-1" value={newLang} onChange={e => { setNewLang(e.target.value); setLanguage('') }}
                       placeholder="Or type a new language…"/>
              </div>
            </div>

            {/* Column name */}
            <div>
              <label className="block text-xs font-mono mb-2" style={{color:'#4a6080',letterSpacing:'0.06em'}}>DISPLAY / COLUMN NAME</label>
              <input className="input-cyber" value={colName} onChange={e => setColName(e.target.value)} placeholder="e.g. Aaj Tak"/>
              <p className="text-xs mt-1" style={{color:'#1e3a5f'}}>Used as the column header in analytics charts</p>
            </div>

            {error && <div className="rounded-xl px-4 py-3 text-xs" style={{background:'rgba(255,45,85,0.08)',border:'1px solid rgba(255,45,85,0.2)',color:'#ff6b85'}}>⚠ {error}</div>}

            <div className="flex gap-3 justify-end">
              <button className="btn btn-ghost" onClick={() => { setStep(1); setError('') }}>← Back</button>
              <button className="btn btn-red" onClick={confirm} disabled={adding}>
                {adding ? <><span className="live-dot" style={{width:6,height:6}}/>Adding…</> : '✚ Add Channel'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
