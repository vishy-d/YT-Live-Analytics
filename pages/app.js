import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth }      from '../hooks/useAuth'
import { useChannels, useConfig } from '../hooks/useFirestore'
import Sidebar       from '../components/Sidebar'
import Header        from '../components/Header'
import ConfigView    from '../components/views/ConfigView'
import ChannelsView  from '../components/views/ChannelsView'
import DashboardView from '../components/views/DashboardView'
import LiveView      from '../components/views/LiveView'

export default function App() {
  const router = useRouter()
  const { user, loading: authLoading, getToken } = useAuth()
  const { channels, addChannel, removeChannel, updateChannel }  = useChannels(user?.uid)
  const { config, addApiKey, removeApiKey, updateCaptureInterval, updateGlobalSchedule } = useConfig(user?.uid)
  const [activeView, setActiveView] = useState('config')
  const [theme,      setTheme]      = useState('dark')

  useEffect(() => {
    if (!user?.uid) return
    try {
      const t = localStorage.getItem(`theme:${user.uid}`) || 'dark'
      setTheme(t)
      document.documentElement.classList.toggle('light', t === 'light')
    } catch {}
  }, [user?.uid])

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('light', next === 'light')
    try { localStorage.setItem(`theme:${user.uid}`, next) } catch {}
  }

  if (authLoading || !user) {
    return (
      <div style={{height:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span className="live-dot live-dot-cyan"/>
          <span className="font-mono text-sm" style={{color:'var(--text3)'}}>Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{height:'100vh',overflow:'hidden',display:'flex',flexDirection:'column',background:'var(--bg)',transition:'background .4s'}}>
      <div className="bg-grid"/>
      <div style={{position:'relative',zIndex:10,flexShrink:0}}>
        <Header user={user} channels={channels} config={config} theme={theme} toggleTheme={toggleTheme}/>
      </div>
      <div style={{display:'flex',flex:1,overflow:'hidden',position:'relative',zIndex:10}}>
        <Sidebar activeView={activeView} setView={setActiveView} channels={channels}/>
        <main style={{flex:1,overflowY:'auto',padding:20}}>
          {activeView === 'config'   && <ConfigView   config={config} addApiKey={addApiKey} removeApiKey={removeApiKey} user={user} updateCaptureInterval={updateCaptureInterval}/>}
          {activeView === 'channels' && <ChannelsView channels={channels} config={config} updateGlobalSchedule={updateGlobalSchedule} addChannel={addChannel} removeChannel={removeChannel} updateChannel={updateChannel} user={user} getToken={getToken}/>}
          {activeView === 'dash'     && <DashboardView channels={channels} getToken={getToken}/>}
          {activeView === 'live'     && <LiveView      channels={channels} config={config} getToken={getToken}/>}
        </main>
      </div>
    </div>
  )
}
