import { useState } from 'react'

const stripHtml = s => (s||'').replace(/<[^>]+>/g,'')

export default function AddChannelModal({ apiKeys, onAdd, onClose }) {
  const [url,       setUrl]       = useState('')
  const [step,      setStep]      = useState(1)
  const [resolving, setResolving] = useState(false)
  const [resolved,  setResolved]  = useState(null)
  const [error,     setError]     = useState('')
  const [language,  setLanguage]  = useState('')
  const [newLang,   setNewLang]   = useState('')
  const [colName,   setColName]   = useState('')
  const [adding,    setAdding]    = useState(false)
  const [useGlobSched, setUseGlobSched] = useState(true)
  const existLangs = ['Hindi','Telugu','Tamil','Kannada','Bengali','Marathi','English']

  async function resolveWithRotation(urlStr) {
    const keys = apiKeys || []
    if (!keys.length) throw new Error('No API keys configured. Add a YouTube API key in Configuration first.')
    let lastError = null
    for (let i = 0; i < keys.length; i++) {
      try {
        const res  = await fetch('/api/youtube/resolve', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ url: urlStr, apiKey: keys[i] }),
        })
        const data = await res.json()
        if (data.error) {
          const msg = (data.error||'').toLowerCase()
          if (msg.includes('quota') || msg.includes('exceeded') || msg.includes('403')) {
            lastError = `Key #${i+1} quota exceeded — trying next key…`; continue
          }
          throw new Error(data.error)
        }
        return data
      } catch (e) {
        const msg = (e.message||'').toLowerCase()
        if (msg.includes('quota') || msg.includes('exceeded') || msg.includes('403')) {
          lastError = `Key #${i+1} quota exceeded`; continue
        }
        throw e
      }
    }
    throw new Error(lastError || 'All API keys have exceeded their daily quota. Wait for midnight PT reset.')
  }

  async function resolve() {
    if (!url.trim() || !apiKeys?.length) return
    setResolving(true); setError('')
    try {
      const data = await resolveWithRotation(url.trim())
      setResolved(data); setColName(data.name); setStep(2)
    } catch(e) { setError(stripHtml(e.message)) }
    setResolving(false)
  }

  async function confirm() {
    const lang = language || newLang.trim()
    if (!lang)           { setError('Select or type a language'); return }
    if (!colName.trim()) { setError('Enter a display name'); return }
    setAdding(true)
    try {
      await onAdd({ channelId:resolved.id, channelName:resolved.name, language:lang, colName:colName.trim(), useGlobalSchedule: useGlobSched })
      onClose()
    } catch(e) { setError(stripHtml(e.message)) }
    setAdding(false)
  }

  const Label = ({children}) => (
    <div style={{fontFamily:"'JetBrains Mono',monospace", fontSize:9, fontWeight:600, letterSpacing:'.09em', color:'var(--text3)', textTransform:'uppercase', marginBottom:6}}>
      {children}
    </div>
  )

  const errBox = error && (
    <div style={{
      padding:'10px 14px', borderRadius:6,
      background:'rgba(255,69,58,.10)', border:'1px solid rgba(255,69,58,.25)',
      color:'var(--red)', fontSize:12,
      display:'flex', gap:8, alignItems:'flex-start',
      fontFamily:"'Inter',sans-serif",
    }}>
      <span style={{flexShrink:0}}>⚠</span><span>{error}</span>
    </div>
  )

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.72)",backdropFilter:"blur(8px)",zIndex:500,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"10vh 20px 40px",overflowY:"auto"}}>
      <div className="animate-card-in" style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:12,padding:"28px",width:500,maxWidth:"100%",boxShadow:"0 24px 64px rgba(0,0,0,.5)",position:"relative",margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24}}>
          <div>
            <div style={{fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:'var(--text4)', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:6}}>
              Step {step} of 2
            </div>
            <h3 style={{fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:18, color:'var(--text1)', margin:0, letterSpacing:'-0.01em'}}>
              Add YouTube Channel
            </h3>
            <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8}}>
              {[1,2].map(s => (
                <div key={s} style={{display:'flex', alignItems:'center', gap:6}}>
                  <div style={{
                    width:20, height:20, borderRadius:4,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:700,
                    fontFamily:"'JetBrains Mono',monospace",
                    background: step>=s ? 'rgba(10,132,255,.18)' : 'var(--bg3)',
                    border:`1px solid ${step>=s ? 'rgba(10,132,255,.4)' : 'var(--border)'}`,
                    color: step>=s ? 'var(--blue2)' : 'var(--text4)',
                    transition:'all .2s',
                  }}>{s}</div>
                  {s<2 && <div style={{width:24, height:1, background:step>1?'var(--blue)':'var(--border)', transition:'background .3s'}}/>}
                </div>
              ))}
              <span style={{fontSize:11, color:'var(--text3)', marginLeft:4, fontFamily:"'Inter',sans-serif"}}>
                {step===1?'Resolve channel':'Configure & add'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-xs"
            style={{fontSize:12, padding:'4px 8px'}}
          >✕</button>
        </div>

        {/* Step 1 */}
        {step===1 && (
          <div style={{display:'flex', flexDirection:'column', gap:14}}>
            <div>
              <Label>YouTube Channel URL</Label>
              <input className="input-cyber" value={url} onChange={e=>setUrl(e.target.value)}
                     placeholder="https://youtube.com/@ChannelName"
                     onKeyDown={e=>e.key==='Enter'&&resolve()}/>
              <p style={{fontSize:11, color:'var(--text4)', marginTop:5, fontFamily:"'JetBrains Mono',monospace"}}>
                Supports: @handle · /channel/UC… · /c/name
              </p>
            </div>

            {!apiKeys?.length ? (
              <div style={{padding:'10px 14px', borderRadius:6, background:'rgba(255,214,10,.08)', border:'1px solid rgba(255,214,10,.2)', color:'var(--amber)', fontSize:12}}>
                ⚠ Add a YouTube API key in Configuration first
              </div>
            ) : (
              <div style={{padding:'8px 12px', borderRadius:5, background:'rgba(48,209,88,.07)', border:'1px solid rgba(48,209,88,.18)', display:'flex', alignItems:'center', gap:7}}>
                <span style={{color:'var(--green)', fontSize:12}}>🔑</span>
                <span style={{fontSize:11, color:'var(--text3)', fontFamily:"'Inter',sans-serif"}}>
                  {apiKeys.length} key{apiKeys.length!==1?'s':''} available · auto-rotates on quota errors
                </span>
              </div>
            )}

            {errBox}
            <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:4}}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-blue" onClick={resolve} disabled={resolving||!url.trim()||!apiKeys?.length} style={{minWidth:110, justifyContent:'center'}}>
                {resolving
                  ? <><span style={{display:'inline-block',width:10,height:10,border:'1.5px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>Resolving…</>
                  : 'Resolve →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step===2 && resolved && (
          <div style={{display:'flex', flexDirection:'column', gap:14}}>
            {/* Resolved channel card */}
            <div style={{padding:'12px 14px', borderRadius:6, background:'var(--bg3)', border:'1px solid var(--border)', position:'relative', overflow:'hidden'}}>
              <div style={{position:'absolute', top:0, left:0, right:0, height:2, background:'var(--blue)', opacity:.6}}/>
              <div style={{fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:15, color:'var(--text1)'}}>{resolved.name}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--text4)', marginTop:2}}>{resolved.id}</div>
              <div style={{marginTop:7, display:'flex', alignItems:'center', gap:6}}>
                {resolved.streams?.length>0
                  ? <><span className="live-dot" style={{width:5, height:5}}/><span style={{fontSize:11, color:'var(--green)', fontWeight:600}}>{resolved.streams.length} stream(s) live now</span></>
                  : <span style={{fontSize:11, color:'var(--text4)'}}>No live streams at this moment</span>}
              </div>
            </div>

            {/* Language */}
            <div>
              <Label>Language / Sheet</Label>
              <div style={{display:'flex', flexWrap:'wrap', gap:5, marginBottom:8}}>
                {existLangs.map(l => (
                  <button key={l} onClick={()=>{setLanguage(l);setNewLang('')}}
                    className="btn btn-xs"
                    style={language===l
                      ? {background:'rgba(10,132,255,.15)', border:'1px solid rgba(10,132,255,.35)', color:'var(--blue2)'}
                      : {background:'transparent', border:'1px solid var(--border)', color:'var(--text3)'}}>
                    {l}
                  </button>
                ))}
              </div>
              <input className="input-cyber" value={newLang}
                     onChange={e=>{setNewLang(e.target.value);setLanguage('')}}
                     placeholder="Or type a new language…"/>
            </div>

            {/* Display name */}
            <div>
              <Label>Display / Column Name</Label>
              <input className="input-cyber" value={colName} onChange={e=>setColName(e.target.value)} placeholder="e.g. Aaj Tak"/>
              <p style={{fontSize:11, color:'var(--text4)', marginTop:4, fontFamily:"'JetBrains Mono',monospace"}}>Used as column header in analytics</p>
            </div>

            {/* Global Schedule Checkbox */}
            <div style={{marginTop: 6, display: 'flex', alignItems: 'center', gap: 8}}>
              <input type="checkbox" id="globSched" checked={useGlobSched} onChange={e=>setUseGlobSched(e.target.checked)} style={{cursor: 'pointer', width: 16, height: 16}} />
              <label htmlFor="globSched" style={{fontFamily:"'Inter',sans-serif", fontSize: 13, color: 'var(--text2)', cursor: 'pointer'}}>Use Global Schedule by default</label>
            </div>

            {errBox}
            <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:4}}>
              <button className="btn btn-ghost" onClick={()=>{setStep(1);setError('')}}>← Back</button>
              <button className="btn btn-red" onClick={confirm} disabled={adding} style={{minWidth:120, justifyContent:'center'}}>
                {adding
                  ? <><span style={{display:'inline-block',width:10,height:10,border:'1.5px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>Adding…</>
                  : '+ Add Channel'}
              </button>
            </div>
          </div>
        )}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}
