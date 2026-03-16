import { useState, useEffect, useCallback } from 'react'
import { db } from '../lib/firebase'
import {
  collection, doc, onSnapshot, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, setDoc, getDoc,
} from 'firebase/firestore'

export function useChannels(uid) {
  const [channels, setChannels] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!uid) { setChannels([]); setLoading(false); return }
    const q = query(
      collection(db, 'channels'),
      where('uid', '==', uid),
      orderBy('createdAt', 'asc'),
    )
    const unsub = onSnapshot(q, snap => {
      setChannels(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [uid])

  const addChannel = useCallback(async (data) => {
    if (!uid) return
    const docRef = await addDoc(collection(db, 'channels'), {
      uid,
      ...data,
      createdAt: new Date().toISOString(),
    })
    return docRef.id
  }, [uid])

  const removeChannel = useCallback(async (firestoreId) => {
    await deleteDoc(doc(db, 'channels', firestoreId))
  }, [])

  return { channels, loading, addChannel, removeChannel }
}

export function useConfig(uid) {
  const [config,  setConfig]  = useState({ apiKeys: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    const ref = doc(db, 'config', uid)
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) setConfig(snap.data())
      else               setConfig({ apiKeys: [] })
      setLoading(false)
    })
    return unsub
  }, [uid])

  const saveConfig = useCallback(async (updates) => {
    if (!uid) return
    await setDoc(doc(db, 'config', uid), updates, { merge: true })
  }, [uid])

  const addApiKey = useCallback(async (key) => {
    if (!uid) return
    const existing = config.apiKeys || []
    if (existing.includes(key)) return
    await setDoc(doc(db, 'config', uid), { apiKeys: [...existing, key] }, { merge: true })
  }, [uid, config])

  const removeApiKey = useCallback(async (idx) => {
    if (!uid) return
    const existing = [...(config.apiKeys || [])]
    existing.splice(idx, 1)
    await setDoc(doc(db, 'config', uid), { apiKeys: existing }, { merge: true })
  }, [uid, config])

  return { config, loading, saveConfig, addApiKey, removeApiKey }
}
