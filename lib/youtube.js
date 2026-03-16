const YT = 'https://www.googleapis.com/youtube/v3'

export async function resolveChannelId(urlOrId, key) {
  // Raw UC... id
  if (/^UC[a-zA-Z0-9_\-]{22}$/.test(urlOrId)) {
    const name = await getChannelName(urlOrId, key)
    return { id: urlOrId, name }
  }
  // /channel/UC...
  const cm = urlOrId.match(/\/channel\/(UC[a-zA-Z0-9_\-]{22})/)
  if (cm) return { id: cm[1], name: await getChannelName(cm[1], key) }

  // @handle
  const hm = urlOrId.match(/@([^\/\?&#\s]+)/)
  if (hm) return resolveHandle(hm[1], key)

  // /c/ or /user/
  const fm = urlOrId.match(/\/(c|user)\/([^\/\?&#\s]+)/)
  if (fm) return resolveSearch(fm[2], key)

  throw new Error('Unrecognized YouTube URL format')
}

async function getChannelName(id, key) {
  const r = await fetch(`${YT}/channels?part=snippet&id=${id}&key=${key}`)
  const d = await r.json()
  if (d.error) throw new Error(d.error.message)
  return d.items?.[0]?.snippet?.title || id
}

async function resolveHandle(handle, key) {
  const r = await fetch(`${YT}/channels?part=snippet&forHandle=${encodeURIComponent(handle)}&key=${key}`)
  const d = await r.json()
  if (d.error) throw new Error(d.error.message)
  if (d.items?.length) return { id: d.items[0].id, name: d.items[0].snippet.title }
  throw new Error('Channel not found: @' + handle)
}

async function resolveSearch(query, key) {
  const r = await fetch(`${YT}/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=1&key=${key}`)
  const d = await r.json()
  if (d.error) throw new Error(d.error.message)
  if (d.items?.length) return { id: d.items[0].snippet.channelId, name: d.items[0].snippet.channelTitle }
  throw new Error('Channel not found: ' + query)
}

export async function fetchLiveStreams(channelId, key) {
  const r = await fetch(`${YT}/search?part=snippet&channelId=${channelId}&eventType=live&type=video&maxResults=10&key=${key}`)
  const d = await r.json()
  if (d.error) throw new Error(d.error.message)
  return (d.items || []).map(v => ({ id: v.id.videoId, title: v.snippet.title }))
}

export async function fetchViewersBatch(videoIds, key) {
  if (!videoIds.length) return []
  const ids = videoIds.slice(0, 50).join(',')
  const r = await fetch(`${YT}/videos?part=liveStreamingDetails&id=${ids}&key=${key}`)
  const d = await r.json()
  if (d.error) throw new Error(d.error.message)
  return (d.items || []).map(v => ({
    id:      v.id,
    viewers: parseInt(v.liveStreamingDetails?.concurrentViewers || 0),
  }))
}
