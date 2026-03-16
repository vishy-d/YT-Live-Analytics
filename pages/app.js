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
  const { channels, addChannel, removeChannel }  = useChannels(user?.uid)
  const { config, addApiKey, removeApiKey, saveConfig } = useConfig(user?.uid)

  const [activeView,   setActiveView]   = useState('config')
  const [capturingSet, setCapturingSet] = useState(new Set())

  // Guard: redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [user, authLoading, router])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="live-dot live-dot-cyan"/>
          <span className="font-mono text-sm" style={{color:'#2a4a6a'}}>Loading session…</span>
        </div>
      </div>
    )
  }

  const capCount = capturingSet.size

  return (
    <div className="flex flex-col h-screen bg-mesh bg-grid-pattern overflow-hidden">

      {/* Ambient scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="scan-line" style={{opacity:.06,animationDuration:'8s'}}/>
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-32 h-32"
             style={{background:'radial-gradient(ellipse at top left, rgba(255,45,85,0.06) 0%, transparent 60%)'}}/>
        <div className="absolute bottom-0 right-0 w-64 h-64"
             style={{background:'radial-gradient(ellipse at bottom right, rgba(0,212,255,0.05) 0%, transparent 60%)'}}/>
      </div>

      {/* Header */}
      <div className="relative z-10">
        <Header user={user} channels={channels} config={config}/>
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar */}
        <Sidebar
          activeView={activeView}
          setView={setActiveView}
          channels={channels}
          capturing={capCount}
        />

        {/* Main scrollable content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-2">
          {activeView === 'config' && (
            <ConfigView
              config={config}
              addApiKey={addApiKey}
              removeApiKey={removeApiKey}
              saveConfig={saveConfig}
            />
          )}

          {activeView === 'channels' && (
            <ChannelsView
              channels={channels}
              config={config}
              addChannel={addChannel}
              removeChannel={removeChannel}
              user={user}
              getToken={getToken}
            />
          )}

          {activeView === 'dash' && (
            <DashboardView
              channels={channels}
              getToken={getToken}
            />
          )}

          {activeView === 'live' && (
            <LiveView
              channels={channels}
              config={config}
            />
          )}
        </main>
      </div>
    </div>
  )
}
