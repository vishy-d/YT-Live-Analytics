import { fetchLiveStreams, fetchViewersBatch, QuotaError, RateLimitError } from '../../../lib/youtube'

// ── Server-side round-robin state (persists across requests in dev/prod) ──
if (!global.__rrState) {
  global.__rrState = {
    index: 0,            // current round-robin position
    usage: {},           // { [keyIndex]: { used: number, lastReset: string } }
    exhausted: new Map(),// keyIndex -> timestamp when exhausted (for cooldown)
    lastCall: {},        // { [keyIndex]: ISO timestamp of last API call }
  }
}

const RATE_LIMIT_DELAY = 1500      // ms to wait on rate limit
const RATE_LIMIT_RETRIES = 2       // retries per key on rate limit
const EXHAUSTED_COOLDOWN = 30 * 60 * 1000  // 30 min cooldown for exhausted keys

function getTodayPT() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }))
    .toISOString().split('T')[0]
}

function resetIfNewDay() {
  const today = getTodayPT()
  const st = global.__rrState
  const anyStale = Object.values(st.usage).some(u => u.lastReset !== today)
  if (anyStale || Object.keys(st.usage).length === 0) {
    st.usage = {}
    st.exhausted = new Map()
  }
}

function trackUsage(keyIndex, units) {
  const today = getTodayPT()
  const st = global.__rrState
  if (!st.usage[keyIndex]) st.usage[keyIndex] = { used: 0, lastReset: today }
  st.usage[keyIndex].used += units
  st.usage[keyIndex].lastReset = today
  st.lastCall[keyIndex] = new Date().toISOString()
}

function markExhausted(keyIndex) {
  global.__rrState.exhausted.set(keyIndex, Date.now())
}

function isExhausted(keyIndex) {
  const st = global.__rrState
  if (!st.exhausted.has(keyIndex)) return false
  // Auto-recover after cooldown (in case of false positive)
  const exhaustedAt = st.exhausted.get(keyIndex)
  if (Date.now() - exhaustedAt > EXHAUSTED_COOLDOWN) {
    st.exhausted.delete(keyIndex)
    return false
  }
  return true
}

function getNextKeyIndex(totalKeys) {
  const st = global.__rrState
  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const idx = st.index % totalKeys
    st.index = (st.index + 1) % totalKeys
    if (!isExhausted(idx)) return idx
  }
  return -1 // all exhausted
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

/**
 * Round-robin key rotation with smart error handling.
 * - QuotaError    → mark key exhausted, try next key
 * - RateLimitError → wait 1.5s, retry SAME key (up to 2 retries), then try next
 * - Other errors  → throw immediately
 */
async function withRoundRobin(keys, fn, quotaCost) {
  resetIfNewDay()
  const totalKeys = keys.length
  let lastErr = null

  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const idx = getNextKeyIndex(totalKeys)
    if (idx === -1) break // all exhausted

    // Try this key with rate-limit retries
    for (let retry = 0; retry <= RATE_LIMIT_RETRIES; retry++) {
      try {
        const result = await fn(keys[idx], idx)
        trackUsage(idx, quotaCost)
        return { result, keyIndex: idx }
      } catch (e) {
        if (e instanceof QuotaError || e?.isQuota) {
          markExhausted(idx)
          trackUsage(idx, quotaCost)
          lastErr = e
          break // move to next key
        }
        if (e instanceof RateLimitError || e?.isRateLimit) {
          lastErr = e
          if (retry < RATE_LIMIT_RETRIES) {
            await sleep(RATE_LIMIT_DELAY * (retry + 1)) // escalating delay
            continue // retry same key
          }
          // Max retries hit — move to next key (but don't mark exhausted)
          break
        }
        throw e // non-quota, non-rate-limit error — throw immediately
      }
    }
  }
  throw lastErr || new Error('All API keys exhausted')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { channelId, apiKey, apiKeys, skipDiscovery, cachedIds, cachedStreams } = req.body
  if (!channelId) return res.status(400).json({ error: 'channelId required' })

  const keys = apiKeys?.length ? apiKeys : (apiKey ? [apiKey] : [])
  if (!keys.length) return res.status(400).json({ error: 'apiKey or apiKeys required' })

  resetIfNewDay()

  try {
    let streams

    if (skipDiscovery && cachedIds?.length) {
      const titleMap = {}
      if (cachedStreams?.length) cachedStreams.forEach(s => { titleMap[s.id] = s.title || '' })
      streams = cachedIds.map(id => ({ id, title: titleMap[id] || '' }))
    } else {
      // search.list costs 100 units
      const disc = await withRoundRobin(keys, (key) => fetchLiveStreams(channelId, key), 100)
      streams = disc.result
    }

    const videoIds = streams.map(s => s.id)
    if (!videoIds.length) {
      return res.json({
        streams: [], total: 0,
        refreshedDiscovery: !skipDiscovery,
        allQuotaExhausted: false,
        quotaInfo: buildQuotaInfo(keys.length),
      })
    }

    // videos.list costs 1 unit
    const viewResult = await withRoundRobin(keys, (key) => fetchViewersBatch(videoIds, key), 1)
    const viewers = viewResult.result

    let total = 0
    const merged = streams.map(s => {
      const v = viewers.find(x => x.id === s.id)
      const views = v?.viewers || 0
      total += views
      return { ...s, views }
    })

    res.json({
      streams: merged, total,
      refreshedDiscovery: !skipDiscovery,
      allQuotaExhausted: false,
      quotaInfo: buildQuotaInfo(keys.length),
    })
  } catch (e) {
    const isAllQuota = e instanceof QuotaError || (e.message || '').toLowerCase().includes('quota')
    res.status(400).json({
      error: e.message,
      allQuotaExhausted: isAllQuota,
      quotaResetInfo: 'Resets at midnight Pacific Time (IST: ~1:30 PM)',
      quotaInfo: buildQuotaInfo(keys.length),
    })
  }
}

function buildQuotaInfo(totalKeys) {
  const st = global.__rrState
  const perKey = []
  let totalUsed = 0

  for (let i = 0; i < totalKeys; i++) {
    const u = st.usage[i] || { used: 0 }
    totalUsed += u.used
    perKey.push({
      index: i,
      used: u.used,
      remaining: Math.max(0, 10000 - u.used),
      exhausted: isExhausted(i),
      lastCall: st.lastCall[i] || null,
    })
  }

  return {
    perKey,
    totalUsed,
    totalQuota: totalKeys * 10000,
    activeKeyIndex: st.index % totalKeys,
    resetTime: 'Midnight Pacific Time',
  }
}
