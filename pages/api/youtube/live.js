import { fetchLiveStreams, fetchViewersBatch } from '../../../lib/youtube'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { channelId, apiKey, skipDiscovery, cachedIds } = req.body
  if (!channelId || !apiKey) return res.status(400).json({ error: 'channelId and apiKey required' })
  try {
    const streams = skipDiscovery && cachedIds?.length
      ? cachedIds.map(id => ({ id }))
      : await fetchLiveStreams(channelId, apiKey)

    const videoIds = streams.map(s => s.id)
    const viewers  = await fetchViewersBatch(videoIds, apiKey)

    let total = 0
    const merged = streams.map(s => {
      const v = viewers.find(x => x.id === s.id)
      const views = v?.viewers || 0
      total += views
      return { ...s, views }
    })

    res.json({ streams: merged, total, refreshedDiscovery: !skipDiscovery })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
}
