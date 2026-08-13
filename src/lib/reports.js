import { brl, fmtDate, fmtDateTime } from './utils.js'

// Trigger a client-side file download
function download(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Export an array of row-objects to CSV (Excel opens it directly)
export function exportCSV(filename, rows) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (v) => {
    const s = String(v ?? '')
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [
    headers.join(';'),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(';')),
  ].join('\n')
  download(filename, '﻿' + csv, 'text/csv;charset=utf-8;')
}

// Build a printable HTML report and open the print dialog (Save as PDF)
export function exportPDF({ title, shopName, period, summary, rows }) {
  const win = window.open('', '_blank')
  if (!win) return
  const summaryHtml = summary
    .map(
      (s) =>
        `<div class="stat"><span class="lbl">${s.label}</span><span class="val">${s.value}</span></div>`,
    )
    .join('')
  const head = rows.length ? Object.keys(rows[0]) : []
  const body = rows
    .map(
      (r) => `<tr>${head.map((h) => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`,
    )
    .join('')

  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title>
  <style>
    *{box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
    body{margin:0;padding:32px;color:#0f172a}
    header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #d1202f;padding-bottom:16px;margin-bottom:24px}
    h1{margin:0;font-size:22px}
    .muted{color:#64748b;font-size:13px;margin-top:4px}
    .stats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px}
    .stat{flex:1;min-width:150px;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
    .stat .lbl{display:block;font-size:11px;text-transform:uppercase;color:#64748b;font-weight:600}
    .stat .val{display:block;font-size:20px;font-weight:800;margin-top:4px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{text-align:left;background:#f1f5f9;padding:10px;font-size:11px;text-transform:uppercase;color:#475569}
    td{padding:9px 10px;border-bottom:1px solid #e2e8f0}
    footer{margin-top:24px;color:#94a3b8;font-size:11px;text-align:center}
    @media print{.noprint{display:none}}
  </style></head><body>
    <header>
      <div><h1>${shopName}</h1><p class="muted">${title} · ${period}</p></div>
      <div class="muted">Gerado em ${fmtDateTime(new Date())}</div>
    </header>
    <div class="stats">${summaryHtml}</div>
    <table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>
    <footer>Relatório gerado pelo painel da Lanchonete Rodrigues</footer>
    <script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>
  </body></html>`)
  win.document.close()
}

export { brl, fmtDate }
