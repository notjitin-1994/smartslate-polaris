import html2canvas from 'html2canvas'

export async function exportPNG(node: HTMLElement) {
  const canvas = await html2canvas(node, { backgroundColor: '#0D1B2A', scale: 2 })
  const dataUrl = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = dataUrl; a.download = 'starmap.png'; a.click()
}

export async function exportPDF(node: HTMLElement) {
  const { jsPDF } = await import('jspdf')
  const canvas = await html2canvas(node, { backgroundColor: '#0D1B2A', scale: 2 })
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' })
  const w = pdf.internal.pageSize.getWidth()
  const h = pdf.internal.pageSize.getHeight()
  pdf.addImage(imgData, 'PNG', 0, 0, w, h)
  pdf.save('starmap.pdf')
}

export function exportCSV(rows: object[], filename: string) {
  const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify((r as any)[k] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`; a.click()
  URL.revokeObjectURL(url)
}


