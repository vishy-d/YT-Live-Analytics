const YT = 'https://www.googleapis.com/youtube/v3'

// ── Error classification ──

/**
 * TRUE quota exhaustion — permanent for the day.
 * Only triggers on quotaExceeded / dailyLimitExceeded.
 */
function isQuotaExhausted(d) {
  if (!d?.error) return false
  const reason  = d.error.errors?.[0]?.reason || ''
  const message = (d.error.message || '').toLowerCase()
  return (
    reason === 'quotaExceeded' ||
    reason === 'dailyLimitExceeded' ||
    (message.includes('quota') && message.includes('exceeded'))
  )
}

/**
 * Temporary rate limit — should retry after a short delay, NOT mark exhausted.
 * Catches rateLimitExceeded and other generic 403s that aren't quota.
 */
function isRateLimit(d) {
  if (!d?.error) return false
  const code    = d.error.code
  const reason  = d.error.errors?.[0]?.reason || ''
  const message = (d.error.message || '').toLowerCase()
  return (
    reason === 'rateLimitExceeded' ||
    (code === 403 && !isQuotaExhausted(d)) ||
    message.includes('rate limit')
  )
}

// Custom error classes
export class QuotaError extends Error {
  constructor(msg) { super(msg); this.name = 'QuotaError'; this.isQuota = true }
}

export class RateLimitError extends Error {
  constructor(msg) { super(msg); this.name = 'RateLimitError'; this.isRateLimit = true }
}

async function ytFetch(url) {
  const r = await fetch(url)
  const d = await r.json()
  if (d.error) {
    if (isQuotaExhausted(d)) throw new QuotaError(d.error.message)
    if (isRateLimit(d))      throw new RateLimitError(d.error.message)
    throw new Error(d.error.message || `YouTube API error ${r.status}`)
  }
  return d
}

export async function resolveChannelId(urlOrId, key) {
  if (/^UC[a-zA-Z0-9_\-]{22}$/.test(urlOrId)) {
    const name = await getChannelName(urlOrId, key)
    return { id: urlOrId, name }
  }
  const cm = urlOrId.match(/\/channel\/(UC[a-zA-Z0-9_\-]{22})/)
  if (cm) return { id: cm[1], name: await getChannelName(cm[1], key) }
  const hm = urlOrId.match(/@([^\/\?\&#\s]+)/)
  if (hm) return resolveHandle(hm[1], key)
  const fm = urlOrId.match(/\/(c|user)\/([^\/\?\&#\s]+)/)
  if (fm) return resolveSearch(fm[2], key)
  throw new Error('Unrecognized YouTube URL format')
}

async function getChannelName(id, key) {
  const d = await ytFetch(`${YT}/channels?part=snippet&id=${id}&key=${key}`)
  return d.items?.[0]?.snippet?.title || id
}

async function resolveHandle(handle, key) {
  const d = await ytFetch(`${YT}/channels?part=snippet&forHandle=${encodeURIComponent(handle)}&key=${key}`)
  if (d.items?.length) return { id: d.items[0].id, name: d.items[0].snippet.title }
  throw new Error('Channel not found: @' + handle)
}

async function resolveSearch(query, key) {
  const d = await ytFetch(`${YT}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1&key=${key}`)
  if (d.items?.length) return { id: d.items[0].snippet.channelId, name: d.items[0].snippet.channelTitle }
  throw new Error('Channel not found: ' + query)
}

export async function fetchLiveStreams(channelId, key) {
  const d = await ytFetch(`${YT}/search?part=snippet&channelId=${channelId}&eventType=live&type=video&maxResults=50&key=${key}`)
  return (d.items || []).map(v => ({ id: v.id.videoId, title: v.snippet.title }))
}

export async function fetchViewersBatch(videoIds, key) {
  if (!videoIds.length) return []
  const ids = videoIds.slice(0, 50).join(',')
  const d   = await ytFetch(`${YT}/videos?part=liveStreamingDetails&id=${ids}&key=${key}`)
  return (d.items || []).map(v => ({
    id:      v.id,
    viewers: parseInt(v.liveStreamingDetails?.concurrentViewers || 0),
  }))
}
