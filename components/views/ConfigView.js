import { useState } from 'react'

const GAS_CODE_PLACEHOLDER = `// ─── Google Apps Script is NOT needed with Next.js + Firebase ───
// All backend logic is handled by Next.js API routes at /pages/api/
// and data is stored in Firestore.
//
// This section is here for reference only if you want a
// standalone HTML fallback. The Next.js app does NOT use Apps Script.`

export default function ConfigView({ config, addApiKey, removeApiKey, saveConfig }) {
  const [keyInput,    setKeyInput]    = useState('')
  const [adding,      setAdding]      = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [showFull,    setShowFull]    = useState({})

  const STEPS = [
    {
      num: '01', color: '#ff2d55',
      title: 'Get YouTube Data API v3 Key',
      lines: [
        'Open console.cloud.google.com and sign in',
        'Create a new project → "YT Analytics"',
        'APIs & Services → Library → search "YouTube Data API v3" → Enable',
        'APIs & Services → Credentials → + Create Credentials → API key',
        'Copy the key (starts with AIzaSy…) and paste it below',
        'Restrict it to YouTube Data API v3 for security',
      ],
    },
    {
      num: '02', color: '#00d4ff',
      title: 'Firebase Project Setup',
      lines: [
        'Open console.firebase.google.com → Add project',
        'Enable Authentication → Email/Password sign-in method',
        'Add a user: Authentication → Users → Add user',
        'Create Firestore database in production mode',
        'Project Settings → Your apps → Add web app → Copy config into .env.local',
        'Project Settings → Service accounts → Generate new private key → copy into .env.local',
      ],
    },
    {
      num: '03', color: '#10ff9a',
      title: 'Deploy to Vercel (free)',
      lines: [
        'Push this project to a GitHub repository',
        'Open vercel.com → Import the repository',
        'Add all environment variables from .env.local.example',
        'Click Deploy — Vercel gives you a free URL',
        'Your team can now access the dashboard from any device',
      ],
    },
  ]

  async function handleAddKey() {
    const k = keyInput.trim()
    if (!k) return
    setAdding(true)
    await addApiKey(k)
    setKeyInput('')
    setAdding(false)
  }

  function maskKey(k) {
    return k.substring(0, 8) + '•'.repeat(16) + k.slice(-4)
  }

  return (
    <div className="animate-slide-up space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span style={{color:'#00d4ff',fontSize:22}}>⚙</span>
          <h2 className="font-display text-2xl font-bold text-white">Tracker Configuration</h2>
        </div>
        <p style={{color:'#2a4a6a',fontSize:13}}>Set up your YouTube API keys and review setup steps</p>
      </div>

      {/* API Keys card */}
      <div className="glass p-6 relative overflow-hidden">
        <div className="scan-line" style={{animationDuration:'6s',opacity:.3}}/>
        <div className="flex items-center gap-2 mb-4">
          <span style={{fontSize:16}}>🔑</span>
          <h3 className="font-display font-semibold text-white">YouTube Data API Keys</h3>
          <span className="badge badge-cyan ml-auto">
            {config.apiKeys?.length || 0} / 10 keys
          </span>
        </div>
        <p style={{color:'#2a4a6a',fontSize:12,marginBottom:16}}>
          Round-robin rotation across all keys · Free tier: 10,000 units/day per key
        </p>

        {/* Input */}
        <div className="flex gap-2 mb-4">
          <input
            className="input-cyber flex-1"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="AIzaSy… (YouTube Data API v3 key)"
            onKeyDown={e => e.key === 'Enter' && handleAddKey()}
          />
          <button className="btn btn-cyan" onClick={handleAddKey} disabled={adding || !keyInput.trim()}>
            {adding ? '…' : '+ Add Key'}
          </button>
        </div>

        {/* Key list */}
        {!config.apiKeys?.length ? (
          <div className="rounded-xl p-6 text-center" style={{background:'rgba(0,212,255,0.03)',border:'1px dashed rgba(0,212,255,0.1)'}}>
            <p style={{color:'#1e3a5f',fontSize:13}}>No API keys yet. Add your first YouTube Data API v3 key above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {config.apiKeys.map((k, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3"
                   style={{background:'rgba(0,212,255,0.04)',border:'1px solid rgba(0,212,255,0.1)'}}>
                <span className="text-xs font-mono" style={{color:'#1e3a5f',width:20}}>#{i+1}</span>
                <span className="font-mono text-xs flex-1" style={{color:'#4a8090'}}>
                  {showFull[i] ? k : maskKey(k)}
                </span>
                <button className="btn btn-ghost btn-xs" onClick={() => setShowFull(p => ({...p,[i]:!p[i]}))}>
                  {showFull[i] ? '🙈' : '👁'}
                </button>
                <span className="badge badge-green" style={{fontSize:10}}>ACTIVE</span>
                <button className="btn btn-xs rounded-lg"
                        style={{background:'rgba(255,45,85,0.1)',border:'1px solid rgba(255,45,85,0.2)',color:'#ff2d55'}}
                        onClick={() => removeApiKey(i)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Quota table */}
        {config.apiKeys?.length > 0 && (
          <div className="mt-4 rounded-xl overflow-hidden" style={{border:'1px solid rgba(0,212,255,0.08)'}}>
            <div className="px-4 py-2" style={{background:'rgba(0,212,255,0.05)',borderBottom:'1px solid rgba(0,212,255,0.08)'}}>
              <span className="font-mono text-xs" style={{color:'#2a6080',letterSpacing:'0.06em'}}>QUOTA ESTIMATE</span>
            </div>
            <div className="grid grid-cols-3 divide-x" style={{divideBorderColor:'rgba(0,212,255,0.06)'}}>
              {[
                { label:'Daily Quota', val:`${(config.apiKeys.length*10000).toLocaleString()} units` },
                { label:'Channels (8h)', val:`~${Math.floor(config.apiKeys.length*10000/(660*8))} channels` },
                { label:'Cost', val:'$0 / month' },
              ].map(s => (
                <div key={s.label} className="px-4 py-3 text-center">
                  <div className="big-num text-xl neon-cyan">{s.val}</div>
                  <div style={{color:'#2a4a6a',fontSize:11,marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Setup Steps */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-5">
          <span style={{fontSize:16}}>🚀</span>
          <h3 className="font-display font-semibold text-white">Setup Guide</h3>
          <span className="badge badge-violet ml-2">One-time setup</span>
        </div>
        <div className="space-y-4">
          {STEPS.map(step => (
            <div key={step.num} className="rounded-xl overflow-hidden"
                 style={{border:`1px solid rgba(${hexToRgb(step.color)},0.15)`}}>
              <div className="flex items-center gap-3 px-4 py-3"
                   style={{background:`rgba(${hexToRgb(step.color)},0.06)`}}>
                <span className="big-num text-2xl" style={{color:step.color}}>{step.num}</span>
                <span className="font-display font-semibold text-sm text-white">{step.title}</span>
              </div>
              <div className="px-4 py-3 space-y-1">
                {step.lines.map((l, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs" style={{color:'#4a6080'}}>
                    <span style={{color:step.color,marginTop:1,flexShrink:0}}>›</span>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture card */}
      <div className="glass p-6">
        <div className="flex items-center gap-2 mb-4">
          <span style={{fontSize:16}}>🏗</span>
          <h3 className="font-display font-semibold text-white">Tech Stack</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon:'⚡', label:'Framework',  val:'Next.js 14',       color:'#00d4ff' },
            { icon:'🔥', label:'Database',   val:'Firebase Firestore',color:'#ff9500' },
            { icon:'🔐', label:'Auth',       val:'Firebase Auth',    color:'#ff2d55' },
            { icon:'📊', label:'Charts',     val:'Chart.js 4',       color:'#10ff9a' },
            { icon:'🌐', label:'Hosting',    val:'Vercel (free)',    color:'#8b5cf6' },
            { icon:'📡', label:'YouTube API',val:'Data API v3',      color:'#ffb700' },
          ].map(t => (
            <div key={t.label} className="flex items-center gap-3 rounded-xl p-3"
                 style={{background:'rgba(0,212,255,0.03)',border:'1px solid rgba(0,212,255,0.07)'}}>
              <span style={{fontSize:18}}>{t.icon}</span>
              <div>
                <div style={{color:'#2a4a6a',fontSize:10,textTransform:'uppercase',letterSpacing:'0.06em'}}>{t.label}</div>
                <div className="font-mono text-xs font-medium" style={{color:t.color}}>{t.val}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `${r},${g},${b}`
}
