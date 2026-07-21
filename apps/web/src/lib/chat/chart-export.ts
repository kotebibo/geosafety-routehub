/**
 * Export a rendered recharts SVG as a PNG download.
 *
 * The chart is styled with theme CSS variables (var(--text-tertiary), …) which
 * resolve to nothing in a standalone image — so the serialized SVG has every
 * var() replaced with its computed value before rasterizing.
 */

const EXPORT_SCALE = 2

export function downloadSvgAsPng(svg: SVGSVGElement, filename: string, title?: string) {
  const rect = svg.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)
  if (!width || !height) return

  const rootStyle = getComputedStyle(document.documentElement)
  const cssVar = (name: string, fallback: string) =>
    rootStyle.getPropertyValue(name).trim() || fallback

  let source = new XMLSerializer().serializeToString(svg)
  source = source.replace(/var\((--[a-z0-9-]+)\)/gi, (_, name: string) => cssVar(name, '#888888'))
  if (!source.includes('xmlns=')) {
    source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }

  const blobUrl = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
  const image = new Image()
  image.onload = () => {
    const titleHeight = title ? 32 : 8
    const canvas = document.createElement('canvas')
    canvas.width = width * EXPORT_SCALE
    canvas.height = (height + titleHeight) * EXPORT_SCALE
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      URL.revokeObjectURL(blobUrl)
      return
    }
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE)
    ctx.fillStyle = cssVar('--bg-primary', '#ffffff')
    ctx.fillRect(0, 0, width, height + titleHeight)
    if (title) {
      ctx.fillStyle = cssVar('--text-primary', '#111111')
      ctx.font =
        '600 13px system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Georgian", sans-serif'
      ctx.fillText(title, 10, 21)
    }
    ctx.drawImage(image, 0, titleHeight, width, height)
    URL.revokeObjectURL(blobUrl)
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }
  image.onerror = () => URL.revokeObjectURL(blobUrl)
  image.src = blobUrl
}
