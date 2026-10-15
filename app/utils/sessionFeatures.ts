import type { Question } from '../data/questions.ts'
import { isTestVersionId, type TestVersionId } from '../data/testVersions.ts'
import { formatTime, isCorrect, type Answers, type TestResult } from './scoring.ts'

export type AttemptSummary = {
  startedAt: number
  finishedAt: number
  versionId: TestVersionId
  correct: number
  total: number
  weightedPercent: number
  elapsedSeconds: number
}

export function findNextQuestionIndex(items: Question[], currentIndex: number, matches: (question: Question) => boolean): number {
  for (let offset = 1; offset <= items.length; offset++) {
    const index = (currentIndex + offset) % items.length
    if (matches(items[index]!)) return index
  }
  return -1
}

export function parseAttemptHistory(raw: string | null): AttemptSummary[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value.filter((entry): entry is AttemptSummary => {
      if (!entry || typeof entry !== 'object') return false
      const item = entry as Partial<AttemptSummary>
      return Number.isFinite(item.startedAt) && Number.isFinite(item.finishedAt) && isTestVersionId(item.versionId)
        && Number.isInteger(item.correct) && Number.isInteger(item.total)
        && Number.isFinite(item.weightedPercent) && Number.isFinite(item.elapsedSeconds)
        && item.total === Number(item.versionId) && item.correct! >= 0 && item.correct! <= item.total!
    }).slice(0, 10)
  } catch { return [] }
}

type MathNode = { tag: string; text: string; children: MathNode[] }

export function mathMarkupToText(markup: string): string {
  const root: MathNode = { tag: 'root', text: '', children: [] }
  const stack = [root]
  for (const match of markup.matchAll(/<(\/?)(([a-z]+))(?:\s[^>]*)?>|([^<]+)/g)) {
    if (match[4]) { stack[stack.length - 1]!.text += match[4]; continue }
    if (match[1] === '/') { if (stack.length > 1) stack.pop(); continue }
    const node: MathNode = { tag: match[3]!, text: '', children: [] }
    stack[stack.length - 1]!.children.push(node)
    stack.push(node)
  }
  const render = (node: MathNode): string => {
    if (node.tag === 'mfrac') return `(${render(node.children[0]!)})/(${render(node.children[1]!)})`
    if (node.tag === 'msup') return `${render(node.children[0]!)}^${render(node.children[1]!)}`
    return node.text + node.children.map(render).join('')
  }
  return render(root)
}

export function formatResultReport(versionName: string, result: TestResult, items: Question[], answers: Answers): string {
  const lines = [
    `IQ Lab — ${versionName} result`,
    `Correct: ${result.correct}/${result.total}`,
    `Weighted score: ${result.weightedPercent}%`,
    `IQ-style index: ${result.iqStyleIndex} (recreational estimate; not a clinical IQ score)`,
    `Time used: ${formatTime(result.elapsedSeconds)}`,
    '',
    'Domain breakdown',
    ...result.sections.map(section => `${section.name}: ${section.correct}/${section.total} correct; ${section.percent}% weighted`),
    '',
    'Answers'
  ]
  items.forEach((question, index) => {
    lines.push(`${index + 1}. [${question.section}] ${question.prompt}`)
    if (question.math) lines.push(`Math: ${mathMarkupToText(question.math)}`)
    if (question.visual) lines.push(`Sequence: ${question.visual.join('  ')}`)
    if (question.pixel) {
      lines.push('Pixel tiles (# = filled, . = empty):')
      question.pixel.panels.forEach((panel, panelIndex) => lines.push(`  Tile ${panelIndex + 1}: ${panel}`))
      question.pixel.optionGrids.forEach((grid, optionIndex) => lines.push(`  Option ${String.fromCharCode(65 + optionIndex)}: ${grid}`))
    }
    lines.push(
      `Your answer: ${answers[question.id]?.trim() || 'Not answered'}`,
      `Correct answer: ${question.answer}`,
      `Result: ${isCorrect(question, answers[question.id]) ? 'Correct' : 'Incorrect'}`,
      `Explanation: ${question.explanation}`,
      ''
    )
  })
  lines.push('This challenge has no population norms or validation study. Scores from different lengths are not interchangeable.')
  return lines.join('\n')
}
