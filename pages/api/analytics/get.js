import { adminAuth } from '../../../lib/firebaseAdmin'
import db from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid
    const { language, from, to } = req.query

    let whereClause = { uid }
    if (language) whereClause.language = language
    if (from || to) {
      whereClause.date = {}
      if (from) whereClause.date.gte = from
      if (to) whereClause.date.lte = to
    }

    const records = await db.analyticsRecord.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
      take: 15000
    })

    const rows = records.map(r => ({
      ...r,
      timestamp: r.timestamp.toISOString()
    }))

    const cols = [...new Set(rows.map(r => r.colName).filter(Boolean))]
    const rowMap = {}
    rows.forEach(r => {
      const key = `${r.date}|${r.time}`
      if (!rowMap[key]) rowMap[key] = { dateTime:`${r.date} ${r.time}`, date:r.date, time:r.time, cols:{} }
      rowMap[key].cols[r.colName] = (rowMap[key].cols[r.colName]||0) + (r.viewers||0)
    })
    res.json({ cols, rows: Object.values(rowMap).sort((a,b)=>a.dateTime.localeCompare(b.dateTime)) })
  } catch(e) {
    console.error('analytics/get', e.code, e.message)
    res.status(500).json({ error: e.message })
  }
}
