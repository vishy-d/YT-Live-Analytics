import { useState, useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const COLORS = [
  '#00d4ff','#ff2d55','#10ff9a','#ffb700','#8b5cf6',
  '#f97316','#ec4899','#06b6d4','#a78bfa','#34d399',
]

function todayStr() { return new Date().toISOString().split('T')[0] }

export default function DashboardView({ channels, getToken }) {
  const [lang,       setLang]       = useState('')
  const [from,       setFrom]       = useState(todayStr())
  const [to,         setTo]         = useState(todayStr())
  const [loading,    setLoading]    = useState(false)
  const [msg,        setMsg]        = useState('')
  const [chartData,  setChartData]  = useState(null)
  const [rawRows,    setRawRows]    = useState([])
  const [cols,       setCols]       = useState([])
  const [enabledCols,setEnabledCols]= useState({})
  const [exporting,  setExporting]  = useState(false)
  const chartRef = useRef(null)

  const langs = [...new Set(channels.map(c => c.language).filter(Boolean))]

  useEffect(() => {
    if (!lang && langs.length) setLang(langs[0])
  }, [langs])

  async function load() {
    if (!lang) { setMsg('⚠ Select a language first'); return }
    setLoading(true); setMsg(''); setChartData(null)

    try {
      const token = await getToken()
      const params = new URLSearchParams({ language: lang, from, to })
      const res = await fetch(`/api/analytics/get?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (!data.rows?.length) { setMsg('⚠ No data for selected date range'); setLoading(false); return }

      setCols(data.cols)
      setRawRows(data.rows)
      const newEnabled = {}
      data.cols.forEach(c => newEnabled[c] = enabledCols[c] !== false)
      setEnabledCols(newEnabled)
      buildChart(data.rows, data.cols, newEnabled)
      setMsg(`✅ ${data.rows.length} data points loaded`)
    } catch (e) {
      setMsg(`❌ ${e.message}`)
    }
    setLoading(false)
  }

  function buildChart(rows, colList, enabled) {
    const labels = rows.map(r => r.time)
    const datasets = colList
      .filter(col => enabled[col] !== false)
      .map((col, i) => ({
        label: col,
        data:  rows.map(r => r.cols?.[col] || 0),
        borderColor:     COLORS[i % COLORS.length],
        backgroundColor: COLORS[i % COLORS.length] + '18',
        borderWidth: 2,
        pointRadius: rows.length > 120 ? 0 : 3,
        pointHoverRadius: 5,
        tension: 0.35,
        fill: false,
      }))
    setChartData({ labels, datasets })
  }

  function toggleCol(col) {
    const next = { ...enabledCols, [col]: !enabledCols[col] }
    setEnabledCols(next)
    if (rawRows.length) buildChart(rawRows, cols, next)
  }

  async function exportExcel() {
    if (!chartData || !rawRows.length) return
    setExporting(true)
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'YT LIVE Analytics'
      const ws = wb.addWorksheet(`${lang} Analytics`)

      // Header row
      const activeCols = cols.filter(c => enabledCols[c] !== false)
      ws.addRow(['Date', 'Time', ...activeCols])
      const hRow = ws.getRow(1)
      hRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A1628' } }

      rawRows.forEach(r => {
        ws.addRow([r.date, r.time, ...activeCols.map(c => r.cols?.[c] || 0)])
      })

      ws.columns.forEach((col, i) => {
        col.width = i < 2 ? 14 : 16
        if (i >= 2) col.numFmt = '#,##0'
      })

      const buf  = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `YT_Live_${lang}_${from}_${to}.xlsx`
      a.click()
    } catch (e) { alert('Export failed: ' + e.message) }
    setExporting(false)
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(10,22,40,0.95)',
        borderColor: 'rgba(0,212,255,0.2)',
        borderWidth: 1,
        titleColor: '#7ab8d4',
        bodyColor:  '#c8dff5',
        titleFont: { family: 'DM Mono', size: 11 },
        bodyFont:  { family: 'DM Mono', size: 12 },
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: '#2a4a6a',
          font: { family: 'DM Mono', size: 10 },
          maxTicksLimit: 16,
          maxRotation: 0,
        },
        grid: { color: 'rgba(0,212,255,0.05)' },
      },
      y: {
        ticks: {
          color: '#2a4a6a',
          font: { family: 'DM Mono', size: 10 },
          callback: v => v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v,
        },
        grid: { color: 'rgba(0,212,255,0.05)' },
      },
    },
  }

  return (
    <div className="animate-slide-up space-y-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span style={{color:'#10ff9a',fontSize:22}}>📊</span>
          <h2 className="font-display text-2xl font-bold text-white">Dashboard</h2>
        </div>
        <p style={{color:'#2a4a6a',fontSize:13}}>Historical viewer analytics from Firestore — per-minute granularity</p>
      </div>

      {/* Controls */}
      <div className="glass p-5 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-mono mb-1.5" style={{color:'#4a6080',letterSpacing:'0.06em'}}>LANGUAGE</label>
            <select className="select-cyber" value={lang} onChange={e => setLang(e.target.value)}>
              <option value="">Select…</option>
              {langs.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono mb-1.5" style={{color:'#4a6080',letterSpacing:'0.06em'}}>FROM</label>
            <input className="input-cyber" type="date" value={from} onChange={e => setFrom(e.target.value)}
                   style={{width:150}}/>
          </div>
          <div>
            <label className="block text-xs font-mono mb-1.5" style={{color:'#4a6080',letterSpacing:'0.06em'}}>TO</label>
            <input className="input-cyber" type="date" value={to} onChange={e => setTo(e.target.value)}
                   style={{width:150}}/>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setFrom(todayStr()); setTo(todayStr()) }}>
            📅 Today
          </button>
          <button className="btn btn-cyan" onClick={load} disabled={loading}>
            {loading ? <><span className="live-dot live-dot-cyan" style={{width:6,height:6}}/>Loading…</> : '📈 Load Chart'}
          </button>
          <button className="btn btn-green btn-sm" onClick={exportExcel} disabled={exporting || !chartData}>
            {exporting ? '…' : '⬇ Export Excel'}
          </button>
        </div>

        {/* Column toggles */}
        {cols.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {cols.map((col, i) => (
              <button key={col} onClick={() => toggleCol(col)}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                      style={enabledCols[col]!==false
                        ? {background:`${COLORS[i%COLORS.length]}18`,border:`1px solid ${COLORS[i%COLORS.length]}40`,color:COLORS[i%COLORS.length]}
                        : {background:'rgba(0,212,255,0.03)',border:'1px solid rgba(0,212,255,0.08)',color:'#2a4a6a'}}>
                <span className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                      style={{background:enabledCols[col]!==false?COLORS[i%COLORS.length]:'#1e3a5f'}}/>
                {col}
              </button>
            ))}
          </div>
        )}

        {msg && (
          <div className="text-xs font-mono px-3 py-2 rounded-lg"
               style={{background:msg.startsWith('✅')?'rgba(16,255,154,0.06)':msg.startsWith('❌')?'rgba(255,45,85,0.06)':'rgba(0,212,255,0.06)',
                       border:`1px solid ${msg.startsWith('✅')?'rgba(16,255,154,0.2)':msg.startsWith('❌')?'rgba(255,45,85,0.2)':'rgba(0,212,255,0.15)'}`,
                       color:msg.startsWith('✅')?'#10ff9a':msg.startsWith('❌')?'#ff6b85':'#5ee3ff'}}>
            {msg}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="chart-wrap" style={{height:420}}>
        {!chartData ? (
          <div className="h-full flex flex-col items-center justify-center" style={{color:'#1e3a5f'}}>
            <div style={{fontSize:48,marginBottom:12,opacity:.3}}>📊</div>
            <p className="font-display text-base" style={{color:'#2a4a6a'}}>Select a language and click Load Chart</p>
            <p className="text-xs mt-1" style={{color:'#1e3a5f'}}>Data is fetched from Firestore in real-time</p>
          </div>
        ) : (
          <Line ref={chartRef} data={chartData} options={chartOptions}/>
        )}
      </div>

      {/* Summary table */}
      {rawRows.length > 0 && cols.length > 0 && (
        <div className="glass p-5">
          <h3 className="font-display font-semibold text-white mb-3 text-sm">Peak Viewers</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cols.filter(c => enabledCols[c]!==false).map((col, i) => {
              const vals = rawRows.map(r => r.cols?.[col] || 0)
              const peak = Math.max(...vals)
              const avg  = vals.reduce((a,b)=>a+b,0) / (vals.filter(v=>v>0).length||1)
              return (
                <div key={col} className="rounded-xl p-4"
                     style={{background:`${COLORS[i%COLORS.length]}08`,border:`1px solid ${COLORS[i%COLORS.length]}20`}}>
                  <div className="text-xs mb-1 truncate" style={{color:'#4a6080'}} title={col}>{col}</div>
                  <div className="big-num text-2xl" style={{color:COLORS[i%COLORS.length]}}>
                    {peak>=1e6?(peak/1e6).toFixed(1)+'M':peak>=1e3?(peak/1e3).toFixed(0)+'K':peak.toLocaleString()}
                  </div>
                  <div className="text-xs mt-0.5" style={{color:'#2a4a6a'}}>
                    avg {avg>=1e3?(avg/1e3).toFixed(0)+'K':Math.round(avg).toLocaleString()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
