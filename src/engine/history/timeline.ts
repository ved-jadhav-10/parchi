// Overlap windows: cut the timeline at every start and end, so doses are added up only for medicines taken together.

export interface Span {
  /** first day taken (day number) */
  start: number
  /** first day NOT taken */
  end: number
}

export interface Window extends Span {
  /** indexes into the spans passed in */
  members: number[]
}

/**
 * Windows from `from` onward where at least one span is active. Adjacent windows with the same members are merged,
 * so a window is a stretch of days with one fixed set of medicines. Empty spans (end <= start) are ignored.
 */
export function buildWindows(spans: Span[], from: number): Window[] {
  const live = spans.map((s, i) => ({ ...s, i })).filter((s) => s.end > s.start && s.end > from)
  const cuts = [...new Set([from, ...live.flatMap((s) => [s.start, s.end]).filter((d) => d >= from)])].sort((a, b) => a - b)
  const windows: Window[] = []
  for (let k = 0; k + 1 < cuts.length; k++) {
    const [start, end] = [cuts[k], cuts[k + 1]]
    const members = live.filter((s) => s.start <= start && s.end >= end).map((s) => s.i)
    if (!members.length) continue
    const prev = windows[windows.length - 1]
    if (prev && prev.end === start && prev.members.join() === members.join()) prev.end = end
    else windows.push({ start, end, members })
  }
  return windows
}
