import assert from 'node:assert/strict'
import test from 'node:test'
import { questions, sections, rotateGrid, reflectGrid, overlayGrids, xorGrids } from '../app/data/questions.ts'
import { isTestVersionId, questionsForVersion, testVersions } from '../app/data/testVersions.ts'
import { calculateResult, formatTime, isCorrect, TEST_DURATION_SECONDS } from '../app/utils/scoring.ts'
import { findNextQuestionIndex, formatResultReport, mathMarkupToText, parseAttemptHistory } from '../app/utils/sessionFeatures.ts'

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

test('all quantitative questions have native math notation and independently checked answers', () => {
  const expected = ['23', '36', '9', '2/3', '27', '10', '108', '1/6', '28', '11', '24', '225', '25', '20', '120', '13/18', '24', '32', '10', '35']
  const items = questions.filter(q => q.section === 'numbers')
  assert.deepEqual(items.map(q => q.answer), expected)
  for (const q of items) {
    assert.ok(q.math?.startsWith('<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">'))
    assert.ok(q.math?.endsWith('</math>'))
    if (q.optionMath) {
      assert.equal(q.optionMath.length, 4)
      assert.ok(q.optionMath.every(item => item.includes('<math') && item.includes('</math>')))
    }
  }
})

test('pixel grids are valid, choices distinct, and transformations preserve geometry', () => {
  const pixelItems = questions.filter(q => q.pixel)
  assert.equal(pixelItems.length, 11)
  for (const q of pixelItems) {
    const pixel = q.pixel!
    assert.equal(pixel.optionGrids.length, 4)
    assert.equal(new Set(pixel.optionGrids).size, 4, q.id)
    assert.ok(pixel.panels.includes('?'))
    assert.ok(pixel.optionGrids[q.options.indexOf(q.answer)])
    for (const grid of [...pixel.panels.filter(panel => panel !== '?'), ...pixel.optionGrids]) {
      assert.match(grid, /^[.#]{5}(\/[.#]{5}){4}$/, q.id)
    }
  }
  const sample = '##.../#..../#..../...../.....'
  assert.equal(rotateGrid(rotateGrid(rotateGrid(rotateGrid(sample)))), sample)
  assert.equal(reflectGrid(reflectGrid(sample)), sample)
  assert.equal(overlayGrids(sample, sample), sample)
  assert.equal(xorGrids(sample, sample), '...../...../...../...../.....')
})

test('pixel answer keys match the rule stated in each prompt', () => {
  const byId = Object.fromEntries(questions.filter(q => q.pixel).map(q => [q.id, q]))
  const correctGrid = (id: string) => {
    const q = byId[id]!
    return q.pixel!.optionGrids[q.options.indexOf(q.answer)]
  }
  const panels = (id: string) => byId[id]!.pixel!.panels
  const turn = (grid: string, count = 1) => Array.from({ length: count }).reduce<string>(value => rotateGrid(value), grid)
  assert.equal(correctGrid('patterns-16'), turn(panels('patterns-16')[0]!, 3))
  assert.equal(correctGrid('patterns-17'), xorGrids(panels('patterns-17')[3]!, panels('patterns-17')[4]!))
  assert.equal(correctGrid('patterns-19'), reflectGrid(panels('patterns-19')[2]!))
  assert.equal(correctGrid('spatial-01'), turn(panels('spatial-01')[0]!))
  assert.equal(correctGrid('spatial-02'), reflectGrid(panels('spatial-02')[0]!))
  assert.equal(correctGrid('spatial-05'), overlayGrids(panels('spatial-05')[0]!, panels('spatial-05')[1]!))
  assert.equal(correctGrid('spatial-08'), turn(panels('spatial-08')[2]!))
  assert.equal(correctGrid('spatial-10'), xorGrids(panels('spatial-10')[0]!, panels('spatial-10')[1]!))
  assert.equal(correctGrid('spatial-12'), overlayGrids(panels('spatial-12')[0]!, panels('spatial-12')[1]!))
  assert.equal(correctGrid('spatial-15'), turn(reflectGrid(panels('spatial-15')[0]!)))
  assert.equal(correctGrid('spatial-17'), turn(panels('spatial-17')[2]!))
})

test('each version has balanced domains, difficulty levels, and a fixed duration', () => {
  assert.deepEqual(testVersions.map(version => [version.id, version.durationSeconds]), [['20', 900], ['50', 2100], ['100', 3600]])
  assert.ok(isTestVersionId('20'))
  assert.ok(!isTestVersionId('40'))
  for (const version of testVersions) {
    const selected = questionsForVersion(version.id)
    assert.equal(selected.length, Number(version.id))
    assert.equal(new Set(selected.map(question => question.id)).size, selected.length)
    for (const section of sections) {
      const part = selected.filter(question => question.section === section.id)
      assert.equal(part.length, selected.length / sections.length)
      assert.deepEqual(new Set(part.map(question => question.difficulty)), new Set([1, 2, 3]))
    }
  }
  assert.deepEqual(questionsForVersion('100').map(question => question.id), questions.map(question => question.id))
})

test('short-version scoring ignores questions outside the selected version', () => {
  for (const version of testVersions) {
    const selected = questionsForVersion(version.id)
    const selectedIds = new Set(selected.map(question => question.id))
    const outsider = questions.find(question => !selectedIds.has(question.id))
    const answers = Object.fromEntries(selected.map(question => [question.id, question.answer]))
    const full = calculateResult(answers, version.durationSeconds + 200, selected, version.durationSeconds)
    assert.equal(full.total, selected.length)
    assert.equal(full.correct, selected.length)
    assert.equal(full.weightedPercent, 100)
    assert.equal(full.iqStyleIndex, 145)
    assert.equal(full.elapsedSeconds, version.durationSeconds)
    assert.ok(full.sections.every(section => section.correct === section.total && section.percent === 100))
    if (outsider) {
      const outsiderOnly = calculateResult({ [outsider.id]: outsider.answer }, 10, selected, version.durationSeconds)
      assert.equal(outsiderOnly.correct, 0)
      assert.equal(outsiderOnly.answered, 0)
      assert.equal(outsiderOnly.iqStyleIndex, 65)
    }
  }
})

test('review navigation wraps and skips questions that do not match', () => {
  const selected = questionsForVersion('20')
  assert.equal(findNextQuestionIndex(selected, 0, item => item.id === selected[3]!.id), 3)
  assert.equal(findNextQuestionIndex(selected, 19, item => item.id === selected[2]!.id), 2)
  assert.equal(findNextQuestionIndex(selected, 0, () => false), -1)
})

test('attempt history rejects malformed entries and keeps the latest ten', () => {
  assert.deepEqual(parseAttemptHistory('bad json'), [])
  const valid = { startedAt: 1, finishedAt: 2, versionId: '20', correct: 12, total: 20, weightedPercent: 60, elapsedSeconds: 500 }
  assert.deepEqual(parseAttemptHistory(JSON.stringify([valid, { ...valid, versionId: '30' }, null])), [valid])
  assert.equal(parseAttemptHistory(JSON.stringify(Array.from({ length: 12 }, (_, index) => ({ ...valid, startedAt: index + 1 })))).length, 10)
})

test('download report includes only the selected version and its explanations', () => {
  const selected = questionsForVersion('20')
  const first = selected[0]!
  const answers = { [first.id]: first.answer }
  const result = calculateResult(answers, 420, selected, 900)
  const report = formatResultReport('Quick', result, selected, answers)
  assert.match(report, /IQ Lab — Quick result/)
  assert.match(report, /Correct: 1\/20/)
  assert.ok(report.includes(first.explanation))
  assert.equal((report.match(/Explanation:/g) ?? []).length, 20)
  assert.match(report, /Math:/)
  assert.match(report, /Pixel tiles/)
  assert.ok(!report.includes('Correct: 1/100'))
})

test('MathML in the report preserves fractions and exponents', () => {
  const squared = questions.find(question => question.id === 'numbers-01')!
  const fraction = questions.find(question => question.id === 'numbers-03')!
  assert.equal(mathMarkupToText(squared.math!), '2^5−3^2')
  assert.equal(mathMarkupToText(fraction.math!), '(3x−5)/(2)=11')
})
