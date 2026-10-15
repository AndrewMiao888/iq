import { questions, sections, type Question, type SectionId } from '../data/questions.ts'

export type Answers = Record<string, string>
export type SectionResult = {
  id: SectionId
  name: string
  correct: number
  answered: number
  total: number
  earnedWeight: number
  maxWeight: number
  percent: number
}
export type TestResult = {
  correct: number
  answered: number
  total: number
  earnedWeight: number
  maxWeight: number
  weightedPercent: number
  chanceAdjustedPercent: number
  iqStyleIndex: number
  elapsedSeconds: number
  sections: SectionResult[]
}

export const TEST_DURATION_SECONDS = 60 * 60
export const weightFor = (question: Question) => [0, 1, 1.5, 2][question.difficulty] ?? 1

export function isCorrect(question: Question, response: string | undefined): boolean {
  if (response === undefined || response.trim() === '') return false
  if (question.kind === 'number') {
    const clean = response.trim().replace(',', '.')
    if (!/^-?\d+(?:\.\d+)?$/.test(clean)) return false
    return Math.abs(Number(clean) - Number(question.answer)) < 1e-9
  }
  return response === question.answer
}

export function calculateResult(answers: Answers, elapsedSeconds: number, selectedQuestions: Question[] = questions, durationSeconds = TEST_DURATION_SECONDS): TestResult {
  const sectionResults = sections.map(section => {
    const items = selectedQuestions.filter(question => question.section === section.id)
    const maxWeight = items.reduce((sum, question) => sum + weightFor(question), 0)
    const earnedWeight = items.reduce((sum, question) => sum + (isCorrect(question, answers[question.id]) ? weightFor(question) : 0), 0)
    return {
      id: section.id,
      name: section.name,
      correct: items.filter(question => isCorrect(question, answers[question.id])).length,
      answered: items.filter(question => (answers[question.id] ?? '').trim() !== '').length,
      total: items.length,
      earnedWeight,
      maxWeight,
      percent: maxWeight ? Math.round(100 * earnedWeight / maxWeight) : 0
    }
  })
  const earnedWeight = sectionResults.reduce((sum, section) => sum + section.earnedWeight, 0)
  const maxWeight = sectionResults.reduce((sum, section) => sum + section.maxWeight, 0)
  const chanceWeight = selectedQuestions.reduce((sum, question) => sum + (question.kind === 'choice' ? weightFor(question) / question.options.length : 0), 0)
  const adjusted = maxWeight > chanceWeight ? Math.max(0, Math.min(1, (earnedWeight - chanceWeight) / (maxWeight - chanceWeight))) : 0

  return {
    correct: sectionResults.reduce((sum, section) => sum + section.correct, 0),
    answered: sectionResults.reduce((sum, section) => sum + section.answered, 0),
    total: selectedQuestions.length,
    earnedWeight,
    maxWeight,
    weightedPercent: maxWeight ? Math.round(100 * earnedWeight / maxWeight) : 0,
    chanceAdjustedPercent: Math.round(100 * adjusted),
    // A transparent, bounded display index. It is not a normed or clinical IQ score.
    iqStyleIndex: Math.round(65 + 80 * Math.pow(adjusted, 0.85)),
    elapsedSeconds: Math.max(0, Math.min(durationSeconds, Math.round(elapsedSeconds))),
    sections: sectionResults
  }
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}
