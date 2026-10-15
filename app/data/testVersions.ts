import { questions, sections, type Question } from './questions.ts'

export type TestVersionId = '20' | '50' | '100'
export type TestVersion = {
  id: TestVersionId
  name: string
  durationSeconds: number
  description: string
  note: string
}

export const testVersions: TestVersion[] = [
  { id: '20', name: 'Quick', durationSeconds: 15 * 60, description: 'A focused sample of all five parts.', note: '4 questions per part' },
  { id: '50', name: 'Standard', durationSeconds: 35 * 60, description: 'More room for patterns and deeper reasoning.', note: '10 questions per part' },
  { id: '100', name: 'Complete', durationSeconds: 60 * 60, description: 'The full challenge and broadest breakdown.', note: '20 questions per part' }
]

const selection: Record<TestVersionId, number[]> = {
  '20': [3, 9, 14, 18],
  '50': [1, 3, 5, 7, 9, 11, 13, 15, 17, 19],
  '100': Array.from({ length: 20 }, (_, index) => index)
}

export function isTestVersionId(value: unknown): value is TestVersionId {
  return value === '20' || value === '50' || value === '100'
}

export function questionsForVersion(id: TestVersionId): Question[] {
  return sections.flatMap(section => {
    const part = questions.filter(question => question.section === section.id)
    return selection[id].map(index => part[index]!)
  })
}
