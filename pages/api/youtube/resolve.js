import { resolveChannelId, fetchLiveStreams } from '../../../lib/youtube'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { url, apiKey } = req.body
  if (!url || !apiKey) return res.status(400).json({ error: 'url and apiKey required' })
  try {
    const ch = await resolveChannelId(url, apiKey)
    const streams = await fetchLiveStreams(ch.id, apiKey)
    res.json({ ...ch, streams })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
}
