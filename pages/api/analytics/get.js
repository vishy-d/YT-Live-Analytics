import { adminDb, adminAuth } from '../../../lib/firebaseAdmin'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const token = req.headers.authorization?.split('Bearer ')[1]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid

    const { language, from, to } = req.query

    let q = adminDb.collection('analytics').where('uid','==',uid)
    if (language) q = q.where('language','==',language)
    if (from)     q = q.where('date','>=',from)
    if (to)       q = q.where('date','<=',to)
    q = q.orderBy('timestamp','asc').limit(2000)

    const snap = await q.get()
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Get distinct columns for this language
    const cols = [...new Set(rows.map(r => r.colName).filter(Boolean))]

    // Build per-minute rows grouped by (date, time)
    const rowMap = {}
    rows.forEach(r => {
      const key = `${r.date}|${r.time}`
      if (!rowMap[key]) rowMap[key] = { dateTime: `${r.date} ${r.time}`, date: r.date, time: r.time, cols: {} }
      // Accumulate if same colName appears multiple times in the same minute
      rowMap[key].cols[r.colName] = (rowMap[key].cols[r.colName] || 0) + r.viewers
    })

    const tableRows = Object.values(rowMap).sort((a,b) => a.dateTime.localeCompare(b.dateTime))

    res.json({ cols, rows: tableRows })
  } catch (e) {
    console.error('analytics/get', e)
    res.status(500).json({ error: e.message })
  }
}
