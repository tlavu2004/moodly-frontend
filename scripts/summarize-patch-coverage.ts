import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve, sep } from 'node:path'

type Counter = { covered: number; total: number }
type Position = { line: number; column: number }
type Span = { start: Position; end: Position }
type CoverageEntry = {
  fnMap: Record<string, { decl: Span; loc: Span }>
  f: Record<string, number>
  statementMap: Record<string, Span>
  s: Record<string, number>
}

const lcovPath = 'coverage/lcov.info'
const detailPath = 'coverage/coverage-final.json'
const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/

function changedLines(base: string | undefined): Map<string, Set<number>> {
  if (!base || !/^[0-9a-fA-F]{40,64}$/.test(base)) {
    throw new Error('PR_BASE_SHA must be a Git commit SHA')
  }
  const diff = execFileSync(
    'git',
    ['-c', 'core.quotePath=false', 'diff', '--no-ext-diff', '--no-color',
      '--find-renames', '--unified=0', '--dst-prefix=b/', base + '...HEAD', '--'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )
  const files = new Map<string, Set<number>>()
  let path: string | undefined
  let inHeader = false
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith('diff --git ')) {
      path = undefined
      inHeader = true
    } else if (inHeader && line.startsWith('+++ b/')) {
      path = line.slice(6).split('\t', 1)[0]
      inHeader = false
    } else if (path) {
      const match = hunk.exec(line)
      if (!match) continue
      const start = Number(match[1])
      const count = Number(match[2] ?? '1')
      const changed = files.get(path) ?? new Set<number>()
      for (let number = start; number < start + count; number++) changed.add(number)
      files.set(path, changed)
    }
  }
  return files
}

function sourcePath(path: string): string {
  const fromRoot = relative(process.cwd(), resolve(path.replaceAll('\\', '/')))
  return isAbsolute(fromRoot) || fromRoot.split(sep)[0] === '..' ? '' : fromRoot.split(sep).join('/')
}

function lcovCounts(changes: Map<string, Set<number>>) {
  const line = { covered: 0, total: 0 }
  const branch = { covered: 0, total: 0 }
  const lineHits = new Map<number, boolean>()
  const branchHits = new Map<number, Counter>()
  let changed: Set<number> | undefined
  for (const record of readFileSync(lcovPath, 'utf8').split(/\r?\n/)) {
    if (record.startsWith('SF:')) {
      changed = changes.get(sourcePath(record.slice(3)))
      lineHits.clear()
      branchHits.clear()
    } else if (record.startsWith('DA:')) {
      const [number, hits] = record.slice(3).split(',')
      if (changed?.has(Number(number))) lineHits.set(Number(number), Number(hits) > 0)
    } else if (record.startsWith('BRDA:')) {
      const [number, , , hits] = record.slice(5).split(',')
      if (changed?.has(Number(number))) {
        const count = branchHits.get(Number(number)) ?? { covered: 0, total: 0 }
        count.covered += Number(Number(hits) > 0)
        count.total++
        branchHits.set(Number(number), count)
      }
    } else if (record === 'end_of_record') {
      for (const [number, hit] of lineHits) {
        const count = branchHits.get(number)
        line.covered += Number(hit)
        line.total++
        branch.covered += count?.covered ?? 0
        branch.total += count?.total ?? 0
      }
    }
  }
  return { line, branch }
}

function overlaps(changed: Set<number>, start: number, end: Position): boolean {
  const last = end.column === 0 && end.line > start ? end.line - 1 : end.line
  for (const line of changed) {
    if (start <= line && line <= last) return true
  }
  return false
}

function detailCounts(changes: Map<string, Set<number>>) {
  const functions = { covered: 0, total: 0 }
  const statements = { covered: 0, total: 0 }
  const report = JSON.parse(readFileSync(detailPath, 'utf8')) as Record<string, CoverageEntry>
  for (const [path, entry] of Object.entries(report)) {
    const changed = changes.get(sourcePath(path))
    if (!changed?.size) continue
    for (const [id, location] of Object.entries(entry.fnMap)) {
      if (overlaps(changed, location.decl.start.line, location.loc.end)) {
        functions.covered += Number(entry.f[id] > 0)
        functions.total++
      }
    }
    for (const [id, location] of Object.entries(entry.statementMap)) {
      if (overlaps(changed, location.start.line, location.end)) {
        statements.covered += Number(entry.s[id] > 0)
        statements.total++
      }
    }
  }
  return { functions, statements }
}

function row(metric: string, target: number, { covered, total }: Counter): string {
  const percent = total ? (100 * covered / total).toFixed(2) + '%' : 'N/A'
  const result = !total ? 'N/A' : covered * 100 >= target * total ? 'Pass' : 'Below target'
  return ['|', metric, '|', covered, '|', total, '|', percent, '|', target + '%', '|', result, '|'].join(' ')
}

const lines = [
  '## Coverage on changed lines', '',
  'Advisory. Counts use changed executable lines and functions or statements that overlap the diff.', '',
]
if (existsSync(lcovPath) && existsSync(detailPath)) {
  const changes = changedLines(process.env.PR_BASE_SHA)
  const { line, branch } = lcovCounts(changes)
  const { functions, statements } = detailCounts(changes)
  lines.push(
    '| Metric | Covered | Total | Coverage | Target | Result |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
    row('LINE', 85, line),
    row('BRANCH', 75, branch),
    row('FUNCTION', 85, functions),
    row('STATEMENT', 85, statements),
  )
} else {
  lines.push('Coverage report unavailable.')
}
const summary = lines.join('\n') + '\n'
const summaryPath = process.env.GITHUB_STEP_SUMMARY
if (!summaryPath) throw new Error('GITHUB_STEP_SUMMARY is required')
process.stdout.write(summary)
appendFileSync(summaryPath, summary, 'utf8')
