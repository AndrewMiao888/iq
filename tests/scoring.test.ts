import assert from 'node:assert/strict'
import test from 'node:test'
import { questions, sections } from '../app/data/questions.ts'
import { calculateResult, formatTime, isCorrect, TEST_DURATION_SECONDS } from '../app/utils/scoring.ts'

test('the bank contains 100 distinct, answerable questions in five equal parts', () => {
  assert.equal(questions.length, 100)
  assert.equal(new Set(questions.map(q => q.id)).size, 100)
  assert.equal(sections.length, 5)
  for (const section of sections) {
    const items = questions.filter(q => q.section === section.id)
    assert.equal(items.length, 20)
    assert.deepEqual(new Set(items.map(q => q.difficulty)), new Set([1, 2, 3]))
    for (const q of items) {
      assert.ok(q.prompt.trim() && q.explanation.trim())
      assert.ok(q.answer.trim())
      if (q.kind === 'choice') {
        assert.equal(q.options.length, 4)
        assert.equal(new Set(q.options).size, 4)
        assert.ok(q.options.includes(q.answer))
      } else {
        assert.equal(q.options.length, 0)
        assert.ok(Number.isFinite(Number(q.answer)))
      }
    }
  }
  assert.ok(questions.some(q => q.kind === 'number'))
  assert.ok(questions.some(q => q.visual))
})

test('numeric answers accept equivalent decimals but reject invalid text', () => {
  const q = questions.find(item => item.kind === 'number')!
  assert.ok(isCorrect(q, q.answer))
  assert.ok(isCorrect(q, `${q.answer}.0`))
  assert.ok(!isCorrect(q, ''))
  assert.ok(!isCorrect(q, 'nonsense'))
})

test('all correct answers produce full weight and the top display index', () => {
  const answers = Object.fromEntries(questions.map(q => [q.id, q.answer]))
  const result = calculateResult(answers, 1800)
  assert.equal(result.correct, 100)
  assert.equal(result.answered, 100)
  assert.equal(result.weightedPercent, 100)
  assert.equal(result.chanceAdjustedPercent, 100)
  assert.equal(result.iqStyleIndex, 145)
  assert.ok(result.sections.every(section => section.correct === 20 && section.percent === 100))
  assert.equal(result.elapsedSeconds, 1800)
})

test('blank answers score zero and time is bounded', () => {
  const result = calculateResult({}, TEST_DURATION_SECONDS + 500)
  assert.equal(result.correct, 0)
  assert.equal(result.answered, 0)
  assert.equal(result.weightedPercent, 0)
  assert.equal(result.iqStyleIndex, 65)
  assert.equal(result.elapsedSeconds, TEST_DURATION_SECONDS)
  assert.equal(formatTime(3661), '61:01')
  assert.equal(formatTime(-10), '00:00')
})

test('advanced questions carry more weight while time cannot change the score', () => {
  const easy = questions.find(q => q.difficulty === 1)!
  const hard = questions.find(q => q.difficulty === 3)!
  const easyResult = calculateResult({ [easy.id]: easy.answer }, 10)
  const hardResult = calculateResult({ [hard.id]: hard.answer }, 10)
  assert.ok(hardResult.earnedWeight > easyResult.earnedWeight)
  assert.ok(hardResult.weightedPercent >= easyResult.weightedPercent)
  assert.equal(calculateResult({ [hard.id]: hard.answer }, 10).iqStyleIndex, calculateResult({ [hard.id]: hard.answer }, 3000).iqStyleIndex)
})
