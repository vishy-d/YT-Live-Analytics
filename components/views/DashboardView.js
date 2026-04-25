import { useState, useEffect, useRef } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const COLORS = [
  '#0a84ff','#30d158','#ff453a','#ffd60a','#bf5af2',
  '#ff9f0a','#00c7be','#64d2ff','#ff375f','#30d158',
]

const todayStr = () => new Date().toISOString().split('T')[0]

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function fmtDate(dateStr) {
  const d  = new Date(dateStr + 'T00:00:00')
  const dd = String(d.getDate()).padStart(2,'0')
  return `${dd}/${MONTHS_SHORT[d.getMonth()]}/${d.getFullYear()}`
}
function fmtDateTime(dateStr) {
  const d   = new Date(dateStr + 'T00:00:00')
  const dd  = String(d.getDate()).padStart(2,'0')
  const day = DAYS_SHORT[d.getDay()]
  return `${dd}/${MONTHS_SHORT[d.getMonth()]}/${d.getFullYear()} - ${day}`
}

export default function DashboardView({ channels, getToken }) {
  const [lang,        setLang]        = useState('')
  const [from,        setFrom]        = useState(todayStr())
  const [to,          setTo]          = useState(todayStr())
  const [loading,     setLoading]     = useState(false)
  const [msg,         setMsg]         = useState('')
  const [chartData,   setChartData]   = useState(null)
  const [rawRows,     setRawRows]     = useState([])
  const [cols,        setCols]        = useState([])
  const [enabledCols, setEnabledCols] = useState({})
  const [exporting,   setExporting]   = useState(false)
  const [channelColors, setChannelColors] = useState({})
  const chartRef = useRef(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dashboard_channel_colors')
      if (saved) setChannelColors(JSON.parse(saved))
    } catch (e) {}
  }, [])

  function getChannelColor(col, idx, customColors = channelColors) {
    return customColors[col] || COLORS[idx % COLORS.length]
  }

  function handleColorChange(col, newColor) {
    const next = { ...channelColors, [col]: newColor }
    setChannelColors(next)
    localStorage.setItem('dashboard_channel_colors', JSON.stringify(next))
    if (rawRows.length) buildChart(rawRows, cols, enabledCols, next)
  }

  const langs = [...new Set(channels.map(c => c.language).filter(Boolean))]
  useEffect(() => { if (!lang && langs.length) setLang(langs[0]) }, [langs])

  async function load() {
    if (!lang) { setMsg('⚠ Select a language first'); return }
    setLoading(true); setMsg(''); setChartData(null)
    try {
      const token  = await getToken()
      const params = new URLSearchParams({ language:lang, from, to })
      const res    = await fetch(`/api/analytics/get?${params}`, { headers:{ Authorization:`Bearer ${token}` } })
      const data   = await res.json()
      if (data.error) throw new Error(data.error)
      if (!data.rows?.length) { setMsg('⚠ No data for selected date range'); setLoading(false); return }
      setCols(data.cols); setRawRows(data.rows)
      const newEnabled = {}
      data.cols.forEach(c => newEnabled[c] = enabledCols[c] !== false)
      setEnabledCols(newEnabled)
      buildChart(data.rows, data.cols, newEnabled)
      setMsg(`✅ ${data.rows.length} data points loaded`)
    } catch (e) { setMsg(`❌ ${e.message}`) }
    setLoading(false)
  }

  function buildChart(rows, colList, enabled, customColors = channelColors) {
    const labels   = rows.map(r => r.date===todayStr() ? r.time : `${r.date.slice(5)} ${r.time}`)
    const datasets = colList.filter(c => enabled[c]!==false).map((col,i) => {
      const color = getChannelColor(col, i, customColors)
      return {
        label: col, data: rows.map(r => r.cols?.[col]||0),
        borderColor: color,
        backgroundColor: color+'14',
        borderWidth:1.5,
        pointRadius: 0,
        pointHoverRadius: 3,
        tension:0.3, fill:false,
      }
    })
    setChartData({ labels, datasets })
  }

  function toggleCol(col) {
    const next = { ...enabledCols, [col]:!enabledCols[col] }
    setEnabledCols(next)
    if (rawRows.length) buildChart(rawRows, cols, next)
  }

  async function exportExcel() {
    if (!rawRows.length) return
    setExporting(true)
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb      = new ExcelJS.Workbook()
      wb.creator    = 'YouTube Analytics'

      // ── Sheet 1: Data table ──
      const activeCols = cols.filter(c => enabledCols[c]!==false)
      const ws         = wb.addWorksheet(`${lang} - Data`)

      // Header row: Date Time, Date, Time, ...channels
      ws.addRow(['Date Time', 'Date', 'Time', ...activeCols])
      const hRow = ws.getRow(1)
      hRow.font = { bold:true, color:{ argb:'FFFFFFFF' }, name:'Calibri', size:11 }
      hRow.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1E3A5F' } }
      hRow.alignment = { vertical:'middle', horizontal:'left' }
      hRow.height = 20

      rawRows.forEach((r, idx) => {
        const row = ws.addRow([
          fmtDateTime(r.date),
          fmtDate(r.date),
          r.time,
          ...activeCols.map(c => r.cols?.[c]||0)
        ])
        // Light alternating: white / very light blue-grey
        if (idx % 2 === 1) {
          row.eachCell(cell => {
            cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFF2F5FA' } }
          })
        }
      })

      // Freeze first row
      ws.views = [{ state:'frozen', ySplit:1 }]

      // Column widths + number formats
      ws.columns.forEach((col, i) => {
        col.width = i===0 ? 24 : i===1 ? 16 : i===2 ? 11 : 15
        if (i >= 3) col.numFmt = '#,##0'
      })

      // ── Sheet 2: Peak summary ──
      const ws2 = wb.addWorksheet(`${lang} - Summary`)
      ws2.addRow(['Channel', 'Peak Viewers', 'Avg Viewers (live)', 'Data Points'])
      const h2 = ws2.getRow(1)
      h2.font = { bold:true, color:{ argb:'FFFFFFFF' }, name:'Calibri', size:11 }
      h2.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1E3A5F' } }
      ws2.views = [{ state:'frozen', ySplit:1 }]
      activeCols.forEach(col => {
        const vals = rawRows.map(r => r.cols?.[col]||0)
        const peak = Math.max(...vals)
        const live = vals.filter(v=>v>0)
        const avg  = live.length ? Math.round(live.reduce((a,b)=>a+b,0)/live.length) : 0
        ws2.addRow([col, peak, avg, live.length])
      })
      ws2.columns.forEach(c => { c.width=22 })

      // ── Sheet 3: Chart ──
      if (chartRef.current) {
        try {
          const canvas  = chartRef.current.canvas
          const imgData = canvas.toDataURL('image/png').split(',')[1]
          const ws3     = wb.addWorksheet(`${lang} - Chart`)
          ws3.addRow([`Viewer Chart: ${lang} | ${fmtDate(from)} → ${fmtDate(to)}`])
          ws3.getRow(1).font = { bold:true, size:13 }
          const imgId = wb.addImage({ base64:imgData, extension:'png' })
          ws3.addImage(imgId, { tl:{ col:0, row:1 }, ext:{ width:900, height:420 } })
        } catch {}
      }

      const buf  = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `YT_Analytics_${lang}_${from}_to_${to}.xlsx`
      a.click()
    } catch (e) { alert('Export failed: '+e.message) }
    setExporting(false)
  }

  // Theme-aware chart colours — read live from DOM so it works in both modes
  const isLight   = typeof document !== 'undefined' && document.documentElement.classList.contains('light')
  const tickClr   = isLight ? '#3a4558'               : '#8a98b0'
  const gridClr   = isLight ? 'rgba(0,0,0,.07)'       : 'rgba(255,255,255,.07)'
  const borderClr = isLight ? 'rgba(0,0,0,.12)'       : 'rgba(255,255,255,.10)'
  const ttBg      = isLight ? 'rgba(255,255,255,.98)'  : 'rgba(13,15,20,.97)'
  const ttBorder  = isLight ? 'rgba(0,0,0,.14)'        : 'rgba(255,255,255,.12)'
  const ttTitle   = isLight ? '#3a4558'                : '#8a98b0'
  const ttBody    = isLight ? '#1a2030'                : '#c8d4e4'

  const chartOptions = {
    responsive:true, maintainAspectRatio:false,
    interaction:{ mode:'index', intersect:false },
    plugins:{
      legend:{ display:false },
      tooltip:{
        backgroundColor: ttBg,
        borderColor: ttBorder, borderWidth:1,
        titleColor: ttTitle,
        bodyColor:  ttBody,
        titleFont:{ family:'IBM Plex Mono', size:10 },
        bodyFont:{ family:'IBM Plex Mono', size:11 },
        padding:10,
        callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}` },
      },
    },
    scales:{
      x:{
        ticks:{ color:tickClr, font:{ family:'IBM Plex Mono', size:10 }, maxTicksLimit:16, maxRotation:0 },
        grid:{ color:gridClr },
        border:{ color:borderClr },
      },
      y:{
        ticks:{
          color:tickClr, font:{ family:'IBM Plex Mono', size:10 },
          callback: v => v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':v,
        },
        grid:{ color:gridClr },
        border:{ color:borderClr },
      },
    },
  }

  return (
    <div className="animate-slide-up" style={{display:'flex', flexDirection:'column', gap:20}}>

      {/* Page header */}
      <div style={{borderBottom:'1px solid var(--border)', paddingBottom:16}}>
        <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:4}}>
          <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--text3)', letterSpacing:'.12em', textTransform:'uppercase'}}>ANALYTICS</span>
          <span style={{color:'var(--border2)'}}>·</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'var(--green)', letterSpacing:'.08em'}}>DASHBOARD</span>
        </div>
        <h2 style={{fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:22, color:'var(--text1)', margin:'0 0 4px', letterSpacing:'-0.01em'}}>
          Analytics Dashboard
        </h2>
      </div>

      {/* Controls bar */}
      <div style={{background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'14px 16px'}}>
        <div style={{display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end', marginBottom: cols.length>0 ? 14 : 0}}>
          <div>
            <label style={{display:'block', fontFamily:"'JetBrains Mono',monospace", fontSize:9, fontWeight:600, letterSpacing:'.08em', color:'var(--text4)', textTransform:'uppercase', marginBottom:5}}>Language</label>
            <select className="select-cyber" value={lang} onChange={e=>setLang(e.target.value)} style={{minWidth:130}}>
              <option value="">Select…</option>
              {langs.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block', fontFamily:"'JetBrains Mono',monospace", fontSize:9, fontWeight:600, letterSpacing:'.08em', color:'var(--text4)', textTransform:'uppercase', marginBottom:5}}>From</label>
            <input className="input-cyber" type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{width:148}}/>
          </div>
          <div>
            <label style={{display:'block', fontFamily:"'JetBrains Mono',monospace", fontSize:9, fontWeight:600, letterSpacing:'.08em', color:'var(--text4)', textTransform:'uppercase', marginBottom:5}}>To</label>
            <input className="input-cyber" type="date" value={to} onChange={e=>setTo(e.target.value)} style={{width:148}}/>
          </div>
          <button className="btn btn-ghost btn-sm" style={{marginBottom:1}} onClick={()=>{setFrom(todayStr());setTo(todayStr())}}>Today</button>
          <button className="btn btn-blue" style={{marginBottom:1}} onClick={load} disabled={loading}>
            {loading
              ? <><span style={{display:'inline-block',width:10,height:10,border:'1.5px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>Loading…</>
              : '↗ Load Chart'}
          </button>
          <button className="btn btn-green btn-sm" style={{marginBottom:1}} onClick={exportExcel} disabled={exporting||!rawRows.length}>
            {exporting ? '…' : '↓ Export Excel'}
          </button>
        </div>

        {/* Column toggles */}
        {cols.length > 0 && (
          <div style={{display:'flex', flexWrap:'wrap', gap:6, paddingTop:12, borderTop:'1px solid var(--border)'}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:'var(--text3)', letterSpacing:'.08em', textTransform:'uppercase', alignSelf:'center', marginRight:4}}>Series</span>
            {cols.map((col,i) => {
              const color = getChannelColor(col, i)
              return (
              <button key={col} onClick={() => toggleCol(col)}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  borderRadius:4, padding:'4px 10px',
                  fontSize:12, fontWeight:500, cursor:'pointer',
                  transition:'all .15s',
                  background: enabledCols[col]!==false ? `${color}14` : 'transparent',
                  border:`1px solid ${enabledCols[col]!==false ? color+'45' : 'var(--border)'}`,
                  color: enabledCols[col]!==false ? color : 'var(--text4)',
                  fontFamily:"'Inter',sans-serif",
                }}>
                <span style={{width:6, height:6, borderRadius:'50%', flexShrink:0, background: enabledCols[col]!==false ? color : 'var(--text4)'}}/>
                {col}
              </button>
            )})}
          </div>
        )}

        {/* Message */}
        {msg && (
          <div style={{
            marginTop:10, padding:'8px 12px', borderRadius:5,
            fontFamily:"'JetBrains Mono',monospace", fontSize:12,
            background: msg.startsWith('✅')?'rgba(48,209,88,.08)':msg.startsWith('❌')?'rgba(255,69,58,.08)':'rgba(10,132,255,.08)',
            border:`1px solid ${msg.startsWith('✅')?'rgba(48,209,88,.22)':msg.startsWith('❌')?'rgba(255,69,58,.22)':'rgba(10,132,255,.18)'}`,
            color: msg.startsWith('✅')?'var(--green)':msg.startsWith('❌')?'var(--red)':'var(--blue2)',
          }}>
            {msg}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'18px', position:'relative', overflow:'hidden', height:400}}>
        {!chartData ? (
          <div style={{height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace", fontSize:32, opacity:.1, marginBottom:12}}>▦</div>
            <p style={{fontFamily:"'Inter',sans-serif", fontSize:14, fontWeight:500, color:'var(--text2)'}}>Select a language and click Load Chart</p>
            <p style={{fontSize:12, color:'var(--text3)', marginTop:4}}>Data fetched from database in real-time</p>
          </div>
        ) : (
          <Line ref={chartRef} data={chartData} options={chartOptions}/>
        )}
      </div>

      {/* Peak summary table */}
      {rawRows.length > 0 && cols.length > 0 && (
        <div style={{background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden'}}>
          <div style={{
            padding:'8px 16px', background:'var(--bg3)', borderBottom:'1px solid var(--border)',
            fontFamily:"'JetBrains Mono',monospace", fontSize:9, fontWeight:600,
            color:'var(--text4)', letterSpacing:'.08em', textTransform:'uppercase',
          }}>Peak &amp; Average Summary</div>
          <table className="data-table" style={{width:'100%'}}>
            <thead>
              <tr>
                <th>Channel</th>
                <th style={{textAlign:'right'}}>Peak Viewers</th>
                <th style={{textAlign:'right'}}>Avg (live)</th>
                <th style={{textAlign:'right'}}>Data Points</th>
              </tr>
            </thead>
            <tbody>
              {cols.filter(c=>enabledCols[c]!==false).map((col,i) => {
                const vals = rawRows.map(r => r.cols?.[col]||0)
                const peak = Math.max(...vals)
                const live = vals.filter(v=>v>0)
                const avg  = live.length ? live.reduce((a,b)=>a+b,0)/live.length : 0
                const fmt  = n => Number(n).toLocaleString('en-IN')
                const color = getChannelColor(col, i)
                return (
                  <tr key={col}>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <input 
                          type="color" 
                          value={color} 
                          onChange={(e) => handleColorChange(col, e.target.value)}
                          style={{width:16, height:16, padding:0, border:'none', cursor:'pointer', background:'transparent'}}
                          title="Change channel color"
                        />
                        <span style={{fontWeight:500, color:'var(--text1)'}}>{col}</span>
                      </div>
                    </td>
                    <td style={{textAlign:'right', fontFamily:"'JetBrains Mono',monospace", fontWeight:600, color:color}}>{fmt(peak)}</td>
                    <td style={{textAlign:'right', fontFamily:"'JetBrains Mono',monospace", color:'var(--text3)'}}>{fmt(Math.round(avg))}</td>
                    <td style={{textAlign:'right', fontFamily:"'JetBrains Mono',monospace", color:'var(--text3)'}}>{live.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
