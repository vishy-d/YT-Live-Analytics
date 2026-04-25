import { useState, useEffect, useCallback } from 'react'
import { auth } from '../lib/firebase'
import { getIdToken } from 'firebase/auth'

async function authFetch(url, options = {}) {
  if (!auth.currentUser) throw new Error('Not authenticated')
  const token = await getIdToken(auth.currentUser)
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export function useChannels(uid) {
  const [channels, setChannels] = useState([])
  const [loading,  setLoading]  = useState(true)

  const fetchChannels = useCallback(async () => {
    if (!uid) { setChannels([]); setLoading(false); return }
    try {
      const data = await authFetch('/api/channels')
      setChannels(data.channels.map(c => ({ firestoreId: c.id, ...c })))
    } catch (e) {
      console.error('useChannels fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => { fetchChannels() }, [fetchChannels])

  const addChannel = useCallback(async (data) => {
    if (!uid) return
    const result = await authFetch('/api/channels', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    await fetchChannels()
    return result.channel?.id
  }, [uid, fetchChannels])

  const removeChannel = useCallback(async (id) => {
    await authFetch(`/api/channels?id=${id}`, { method: 'DELETE' })
    await fetchChannels()
  }, [fetchChannels])

  const updateChannel = useCallback(async (id, data) => {
    if (!uid) return
    await authFetch('/api/channels', {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    })
    await fetchChannels()
  }, [uid, fetchChannels])

  return { channels, loading, addChannel, removeChannel, updateChannel }
}

export function useConfig(uid) {
  const [config,  setConfig]  = useState({ apiKeys: [], captureInterval: 60, globalSchedule: { enabled: false, startHour: 9, endHour: 23 } })
  const [loading, setLoading] = useState(true)

  const fetchConfig = useCallback(async () => {
    if (!uid) { setLoading(false); return }
    try {
      const data = await authFetch('/api/config')
      setConfig({ apiKeys: data.apiKeys || [], captureInterval: data.captureInterval || 60, globalSchedule: data.globalSchedule || { enabled: false, startHour: 9, endHour: 23 } })
    } catch (e) {
      console.error('useConfig fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const saveConfig = useCallback(async (updates) => {
    if (!uid) return
    await authFetch('/api/config', {
      method: 'POST',
      body: JSON.stringify(updates),
    })
    await fetchConfig()
  }, [uid, fetchConfig])

  const addApiKey = useCallback(async (key) => {
    if (!uid) return
    const existing = config.apiKeys || []
    if (existing.includes(key)) return
    await saveConfig({ apiKeys: [...existing, key] })
  }, [uid, config, saveConfig])

  const removeApiKey = useCallback(async (idx) => {
    if (!uid) return
    const existing = [...(config.apiKeys || [])]
    existing.splice(idx, 1)
    await saveConfig({ apiKeys: existing })
  }, [uid, config, saveConfig])

  const updateCaptureInterval = useCallback(async (interval) => {
    if (!uid) return
    // Optimistic update — reflect immediately in UI
    setConfig(prev => ({ ...prev, captureInterval: interval }))
    await authFetch('/api/config', {
      method: 'POST',
      body: JSON.stringify({ captureInterval: interval }),
    })
    // Refetch to confirm persisted value
    await fetchConfig()
  }, [uid, fetchConfig])

  const updateGlobalSchedule = useCallback(async (globalSchedule) => {
    if (!uid) return
    setConfig(prev => ({ ...prev, globalSchedule }))
    await authFetch('/api/config', {
      method: 'POST',
      body: JSON.stringify({ globalSchedule }),
    })
    await fetchConfig()
  }, [uid, fetchConfig])

  return { config, loading, saveConfig, addApiKey, removeApiKey, updateCaptureInterval, updateGlobalSchedule }
}
