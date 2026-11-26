import type { HighlightFragment } from '../../../api/openapi/types.api.ts'

function splitsSurrogate(text: string, offset: number): boolean {
  const previous = text.charCodeAt(offset - 1)
  const next = text.charCodeAt(offset)
  return previous >= 0xD800 && previous <= 0xDBFF && next >= 0xDC00 && next <= 0xDFFF
}

export function HighlightText({ fragment }: { fragment: HighlightFragment }) {
  const { text, ranges } = fragment
  if (!Array.isArray(ranges) || ranges.some((range) =>
    !range || !Number.isInteger(range.start) || !Number.isInteger(range.end) ||
    range.start < 0 || range.end <= range.start || range.end > text.length ||
    splitsSurrogate(text, range.start) || splitsSurrogate(text, range.end),
  )) return text

  let cursor = 0
  const parts = []
  for (const { start, end } of [...ranges].sort((a, b) => a.start - b.start)) {
    if (start < cursor) return text
    parts.push(text.slice(cursor, start))
    parts.push(<mark key={start} className="rounded bg-warning-soft text-foreground">{text.slice(start, end)}</mark>)
    cursor = end
  }
  parts.push(text.slice(cursor))
  return parts
}

