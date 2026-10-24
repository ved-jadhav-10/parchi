const cell = (v: unknown) => {
  const s = Array.isArray(v) ? v.join('; ') : String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const toCsv = (columns: string[], rows: Record<string, unknown>[]) =>
  [columns, ...rows.map((r) => columns.map((c) => r[c]))].map((row) => row.map(cell).join(',')).join('\r\n')

export const downloadText = (filename: string, text: string, type: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}
