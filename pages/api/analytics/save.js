import { adminAuth } from '../../../lib/firebaseAdmin'
import db from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid

    const { channelId, channelName, language, colName, viewers, streams, timestamp } = req.body
    const ts  = new Date(timestamp || Date.now())
    const date = ts.toISOString().split('T')[0]
    const time = ts.toTimeString().substring(0, 5)

    await db.analyticsRecord.create({
      data: {
        uid,
        channelId,
        channelName,
        language,
        colName,
        viewers: parseInt(viewers) || 0,
        streams: JSON.stringify(streams || []),
        date,
        time,
        timestamp: ts
      }
    })

    res.json({ ok: true })
  } catch (e) {
    console.error('analytics/save', e)
    res.status(500).json({ error: e.message })
  }
}
