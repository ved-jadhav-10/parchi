import layout from '../layout.json'
import type { CamKey } from './PageCam'

export type Box = { x: number; y: number; w: number; h: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const L = layout as any

/** Camera key that puts the centre of `b` at screen offset (sx, sy) from the frame centre. */
export const focus = (frame: number, b: Box, zoom: number, sx = 0, sy = 0): CamKey => ({
  frame,
  cx: b.x + b.w / 2 - sx / zoom,
  cy: b.y + b.h / 2 - sy / zoom,
  zoom,
})
export const full = (frame: number): CamKey => ({ frame, cx: 960, cy: 540, zoom: 1 })

export const union = (...bs: Box[]): Box => {
  const x = Math.min(...bs.map((b) => b.x))
  const y = Math.min(...bs.map((b) => b.y))
  return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y }
}

/** Page-space point to screen space for a given camera (flat mode), so screen-fixed overlays can follow the page. */
export const toScreen = (p: { x: number; y: number }, cam: { cx: number; cy: number; zoom: number }) => ({
  x: 960 + (p.x - cam.cx) * cam.zoom,
  y: 540 + (p.y - cam.cy) * cam.zoom,
})
