export type SectionId = 'patterns' | 'logic' | 'numbers' | 'spatial' | 'verbal'
export type Difficulty = 1 | 2 | 3
export type Question = {
  id: string
  section: SectionId
  kind: 'choice' | 'number'
  prompt: string
  options: string[]
  answer: string
  difficulty: Difficulty
  explanation: string
  visual?: string[]
  math?: string
  optionMath?: string[]
  pixel?: { panels: string[]; columns: number; optionGrids: string[] }
}

export const sections: { id: SectionId; name: string; kicker: string; description: string; glyph: string }[] = [
  { id: 'patterns', name: 'Patterns', kicker: '01 / SEQUENCES', description: 'Spot the rule hiding in plain sight.', glyph: '◈' },
  { id: 'logic', name: 'Logic', kicker: '02 / REASONING', description: 'Follow the evidence, not the instinct.', glyph: '◇' },
  { id: 'numbers', name: 'Numbers', kicker: '03 / QUANTITATIVE', description: 'Work through quantities and relationships.', glyph: '⌗' },
  { id: 'spatial', name: 'Spatial', kicker: '04 / VISUAL THINKING', description: 'Rotate, reflect, and map your way through.', glyph: '⬡' },
  { id: 'verbal', name: 'Verbal', kicker: '05 / LANGUAGE', description: 'Find meaning and relationships in words.', glyph: '✳' }
]

type Draft = Omit<Question, 'id' | 'section'>
const choice = (prompt: string, options: string[], correct: number, difficulty: Difficulty, explanation: string, visual?: string[]): Draft => ({ kind: 'choice', prompt, options, answer: options[correct] ?? '', difficulty, explanation, visual })
const number = (prompt: string, answer: number, difficulty: Difficulty, explanation: string, visual?: string[]): Draft => ({ kind: 'number', prompt, options: [], answer: String(answer), difficulty, explanation, visual })
const sequence = (visual: string[], options: string[], correct: number, difficulty: Difficulty, explanation: string): Draft => choice('What comes next in the sequence?', options, correct, difficulty, explanation, visual)
const math = (content: string) => `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">${content}</math>`
const m = (value: string) => `<mn>${value}</mn>`
const v = (value: string) => `<mi>${value}</mi>`
const op = (value: string) => `<mo>${value}</mo>`
const frac = (top: string, bottom: string) => `<mfrac>${m(top)}${m(bottom)}</mfrac>`
const pow = (base: string, exponent: string) => `<msup>${m(base)}${m(exponent)}</msup>`

export function rotateGrid(grid: string): string {
  const rows = grid.split('/')
  return rows[0]!.split('').map((_, x) => rows.map(row => row[x]).reverse().join('')).join('/')
}
export function reflectGrid(grid: string): string { return grid.split('/').map(row => [...row].reverse().join('')).join('/') }
export function overlayGrids(a: string, b: string): string {
  return a.split('/').map((row, y) => [...row].map((cell, x) => cell === '#' || b.split('/')[y]?.[x] === '#' ? '#' : '.').join('')).join('/')
}
export function xorGrids(a: string, b: string): string {
  return a.split('/').map((row, y) => [...row].map((cell, x) => (cell === '#') !== (b.split('/')[y]?.[x] === '#') ? '#' : '.').join('')).join('/')
}
const turn = (grid: string, count: number) => Array.from({ length: count }).reduce<string>(result => rotateGrid(result), grid)
const pixelChoice = (prompt: string, panels: string[], optionGrids: string[], correct: number, difficulty: Difficulty, explanation: string, columns = 3): Draft => ({
  ...choice(prompt, ['A', 'B', 'C', 'D'], correct, difficulty, explanation),
  pixel: { panels, optionGrids, columns }
})
const mathNumber = (prompt: string, expression: string, answer: number, difficulty: Difficulty, explanation: string): Draft => ({ ...number(prompt, answer, difficulty, explanation), math: math(expression) })
const mathChoice = (prompt: string, expression: string, options: string[], correct: number, difficulty: Difficulty, explanation: string, optionMath?: string[]): Draft => ({ ...choice(prompt, options, correct, difficulty, explanation), math: math(expression), optionMath: optionMath?.map(item => math(item)) })

const corner = '##.../#..../#..../...../.....'
const offset = '.#.../.##../..#../...../.....'
const barsA = '#..../.#.../..#../...../.....'
const barsB = '...../..#../...#./....#/.....'
const blockA = '##.../##.../...../...../.....'
const blockB = '.##../.##../...../...##/...##'

const bank: Record<SectionId, Draft[]> = {
  patterns: [
    sequence(['2', '4', '6', '8', '?'], ['9', '10', '11', '12'], 1, 1, 'Add 2 each time.'),
    sequence(['3', '6', '12', '24', '?'], ['36', '42', '48', '54'], 2, 1, 'Double each term.'),
    sequence(['1', '4', '9', '16', '?'], ['20', '25', '27', '32'], 1, 1, 'These are consecutive square numbers.'),
    sequence(['A', 'C', 'E', 'G', '?'], ['H', 'I', 'J', 'K'], 1, 1, 'Skip one letter each time.'),
    sequence(['20', '17', '14', '11', '?'], ['7', '8', '9', '10'], 1, 1, 'Subtract 3 each time.'),
    sequence(['1', '1', '2', '3', '5', '?'], ['7', '8', '9', '10'], 1, 1, 'Each term is the sum of the two before it.'),
    sequence(['2', '5', '10', '17', '?'], ['24', '25', '26', '27'], 2, 2, 'The differences are 3, 5, 7, then 9.'),
    sequence(['Z', 'W', 'T', 'Q', '?'], ['N', 'M', 'O', 'P'], 0, 2, 'Move back three letters each time.'),
    sequence(['4', '7', '13', '22', '?'], ['31', '33', '34', '36'], 2, 2, 'The differences grow by 3: 3, 6, 9, 12.'),
    sequence(['1', '2', '6', '24', '?'], ['96', '100', '120', '144'], 2, 2, 'Multiply successively by 2, 3, 4, then 5.'),
    sequence(['8', '4', '12', '6', '18', '?'], ['9', '12', '24', '36'], 0, 2, 'Alternate dividing by 2 and multiplying by 3.'),
    sequence(['B', 'D', 'G', 'K', '?'], ['N', 'O', 'P', 'Q'], 2, 2, 'Letter jumps increase: 2, 3, 4, then 5.'),
    sequence(['2', '3', '5', '8', '12', '?'], ['16', '17', '18', '19'], 1, 2, 'The differences increase by one: 1, 2, 3, 4, 5.'),
    sequence(['81', '27', '9', '3', '?'], ['0', '1', '2', '3'], 1, 2, 'Divide by 3 each time.'),
    sequence(['2', '5', '11', '23', '47', '?'], ['93', '94', '95', '97'], 2, 3, 'Each term is twice the preceding term plus 1.'),
    pixelChoice('The shape rotates a quarter turn clockwise each step. Which tile completes the sequence?', [corner, turn(corner, 1), turn(corner, 2), '?'], [turn(corner, 3), corner, reflectGrid(corner), turn(corner, 1)], 0, 3, 'A fourth tile is the original corner after three clockwise quarter turns.', 4),
    pixelChoice('In each row, the third tile shows pixels present in exactly one of the first two. Which tile is missing?', [barsA, barsB, xorGrids(barsA, barsB), blockA, blockB, '?'], [overlayGrids(blockA, blockB), xorGrids(blockA, blockB), blockA, reflectGrid(blockB)], 1, 3, 'Combine the first two tiles using exclusive OR: a pixel appears only when it is present in exactly one input.', 3),
    sequence(['4', '7', '13', '25', '49', '?'], ['95', '96', '97', '99'], 2, 3, 'The successive differences double: 3, 6, 12, 24, then 48.'),
    pixelChoice('The right tile mirrors the left tile. Apply the same rule to the lower left tile.', [corner, reflectGrid(corner), offset, '?'], [turn(offset, 1), reflectGrid(offset), turn(offset, 2), offset], 1, 3, 'Reflect the lower left tile across a vertical axis.', 2),
    sequence(['1', '2', '5', '12', '29', '?'], ['68', '69', '70', '71'], 2, 3, 'Each term equals twice the previous term plus the term before that: 2 × 29 + 12 = 70.')
  ],
  logic: [
    choice('All roses are flowers. All flowers are plants. What must be true?', ['All plants are roses', 'All roses are plants', 'Some flowers are not plants', 'No roses are plants'], 1, 1, 'The subset relationship carries through.'),
    choice('Mia is taller than Leo. Leo is taller than Sam. Who is shortest?', ['Mia', 'Leo', 'Sam', 'Cannot tell'], 2, 1, 'Sam is below both Leo and Mia.'),
    choice('A light is on only if its switch is up. The light is on. What follows?', ['The switch is up', 'The switch is down', 'The bulb is broken', 'Nothing follows'], 0, 1, '“Only if” makes an up switch necessary.'),
    choice('Every triangle has three sides. Shape X is a triangle. How many sides does X have?', ['2', '3', '4', 'Cannot tell'], 1, 1, 'The definition applies to X.'),
    choice('No cats are reptiles. Luna is a cat. What must be true?', ['Luna is a reptile', 'Luna is not a reptile', 'All reptiles are cats', 'Nothing follows'], 1, 1, 'A cat cannot be a reptile under the premise.'),
    choice('If it rains, the path gets wet. It rains. What follows?', ['The path gets wet', 'The path stays dry', 'Rain stops', 'Nothing follows'], 0, 1, 'This is a direct if–then inference.'),
    choice('All poets are readers. Some readers are cyclists. Must some poets be cyclists?', ['Yes', 'No, none are', 'Not enough information', 'All poets are cyclists'], 2, 2, 'The cyclists among readers need not be poets.'),
    choice('If the alarm rings, the door is open. The door is closed. What follows?', ['The alarm rings', 'The alarm does not ring', 'The alarm is broken', 'Nothing follows'], 1, 2, 'The contrapositive rules out a ringing alarm.'),
    choice('Ava finished before Ben. Cara finished after Ben. Which order is possible?', ['Cara, Ava, Ben', 'Ben, Ava, Cara', 'Ava, Ben, Cara', 'Ben, Cara, Ava'], 2, 2, 'Ava precedes Ben, who precedes Cara.'),
    choice('Exactly one of these statements is true: “The coin is gold” and “The coin is silver.” The coin is not gold. What is it?', ['Gold', 'Silver', 'Both', 'Neither'], 1, 2, 'The second statement must be the one true statement.'),
    choice('Some musicians are painters. All painters are artists. What must be true?', ['All musicians are artists', 'Some musicians are artists', 'No musicians are artists', 'All artists are painters'], 1, 2, 'The musician-painters are artists.'),
    choice('If P then Q. Q is true. Can you conclude P?', ['Always', 'Never', 'Not from this alone', 'Only if Q is false'], 2, 2, 'Q may have another cause.'),
    choice('Four people sit in a row. Ana is left of Bo, and Bo is left of Cy. Who cannot sit at the far left?', ['Ana', 'Bo', 'Cy', 'A fourth person'], 2, 2, 'Cy must have both Ana and Bo to the left.'),
    choice('Exactly two of A, B, and C are true. A is false. What follows?', ['B and C are true', 'B is false', 'C is false', 'Nothing follows'], 0, 2, 'The two remaining statements must both be true.'),
    choice('Four researchers finish in different places. Bea finishes before Dev; Dev is immediately after Ana; Ana finishes before Cy. Which order is possible?', ['Ana, Dev, Bea, Cy', 'Bea, Ana, Dev, Cy', 'Bea, Dev, Ana, Cy', 'Cy, Bea, Ana, Dev'], 1, 3, 'Bea must precede Dev, while Ana and Dev must be adjacent in that order.'),
    choice('Exactly one of P and Q is true. If P is true, then R is true. R is false. What must follow?', ['P is true', 'Q is true', 'Both are false', 'R is true'], 1, 3, 'R being false makes P false by contraposition. Exactly one of P and Q is true, so Q is true.'),
    choice('Exactly one person lied. Ada says “Ben lied.” Ben says “Cy lied.” Cy says “Ben lied.” Who lied?', ['Ada', 'Ben', 'Cy', 'No consistent answer'], 1, 3, 'Ada and Cy make the same claim. If both are truthful, Ben lied and his claim about Cy is false: exactly one liar, Ben.'),
    choice('Every archivist is a researcher. No researcher is careless. Some volunteers are archivists. Which conclusion is forced?', ['All volunteers are researchers', 'Some volunteers are not careless', 'No volunteers are careless', 'Some careless people are archivists'], 1, 3, 'The volunteers who are archivists are researchers, so those volunteers are not careless.'),
    choice('A report is approved if and only if it has both a signature and a date. It has a signature but was not approved. What follows?', ['It has a date', 'It lacks a date', 'It has neither', 'The rule was violated'], 1, 3, 'Approval requires both conditions. With a signature present, the missing date explains nonapproval.'),
    choice('A rule says: if a card has a vowel on one side, it has an even number on the other. Which cards must be turned to test it?', ['A and 4', 'A and 7', 'K and 4', 'K and 7'], 1, 3, 'Check the vowel and the odd number, which could falsify the rule.', ['A', 'K', '4', '7'])
  ],
  numbers: [
    mathNumber('Evaluate the expression.', `${pow('2', '5')}${op('−')}${pow('3', '2')}`, 23, 1, '32 − 9 = 23.'),
    mathNumber('Find 15% of 240.', `${m('15')}${op('%')}${op('×')}${m('240')}`, 36, 1, '0.15 × 240 = 36.'),
    mathNumber('Solve for x.', `<mfrac><mrow>${m('3')}${v('x')}${op('−')}${m('5')}</mrow>${m('2')}</mfrac>${op('=')}${m('11')}`, 9, 1, 'Multiply by 2, add 5, then divide by 3.'),
    mathChoice('Which fraction is greatest?', `${frac('7', '12')}${op(',')}${frac('5', '8')}${op(',')}${frac('2', '3')}${op(',')}${frac('11', '18')}`, ['7/12', '5/8', '2/3', '11/18'], 2, 1, 'At a denominator of 72 these are 42, 45, 48, and 44 parts respectively.', [frac('7', '12'), frac('5', '8'), frac('2', '3'), frac('11', '18')]),
    mathNumber('Four rows hold six tiles each, with three extra tiles. How many tiles are there?', `${m('4')}${op('×')}${m('6')}${op('+')}${m('3')}`, 27, 1, 'Four rows give 24 tiles, then add 3.'),
    mathNumber('Find the mean of these four values.', `${m('6')}${op(',')}${m('8')}${op(',')}${m('10')}${op(',')}${m('16')}`, 10, 1, 'The sum is 40, and 40 ÷ 4 = 10.'),
    mathNumber('An item costs $150. Its price falls 20%, then another 10%. What is the final price in dollars?', `${m('150')}${op('×')}${m('0.8')}${op('×')}${m('0.9')}`, 108, 2, 'Successive discounts multiply: 150 × 0.8 × 0.9 = 108.'),
    mathChoice('Two fair dice are rolled. What is the probability that their sum is 7?', `${v('P')}${op('(')}${v('sum')}${op('=')}${m('7')}${op(')')}`, ['1/12', '1/9', '1/6', '1/4'], 2, 2, 'Six of the 36 ordered outcomes sum to 7.', [frac('1', '12'), frac('1', '9'), frac('1', '6'), frac('1', '4')]),
    mathNumber('Five notebooks cost $17.50. What do eight cost in dollars?', `<mfrac>${m('17.50')}${m('5')}</mfrac>${op('×')}${m('8')}`, 28, 2, 'Each notebook costs $3.50, so eight cost $28.'),
    mathNumber('Solve for x.', `${m('2')}${op('(')}${v('x')}${op('−')}${m('3')}${op(')')}${op('+')}${m('5')}${op('=')}${m('21')}`, 11, 2, '2x − 1 = 21, so x = 11.'),
    mathChoice('Red to blue beads are in a 3:5 ratio. There are 64 beads. How many are red?', `${v('red')}${op(':')}${v('blue')}${op('=')}${m('3')}${op(':')}${m('5')}`, ['16', '21', '24', '40'], 2, 2, 'There are eight equal parts, each worth 8; red occupies three parts.'),
    mathNumber('A train covers 150 km in 2.5 hours. At that speed, how far does it go in 3.75 hours (km)?', `<mfrac>${m('150')}${m('2.5')}</mfrac>${op('×')}${m('3.75')}`, 225, 2, 'The speed is 60 km/h; 60 × 3.75 = 225.'),
    mathNumber('Evaluate without expanding both squares.', `${pow('13', '2')}${op('−')}${pow('12', '2')}`, 25, 2, 'Use the difference of squares: (13 − 12)(13 + 12) = 25.'),
    mathChoice('The mean of five numbers is 12. Four are shown. What is the missing number?', `${m('4')}${op(',')}${m('9')}${op(',')}${m('12')}${op(',')}${m('15')}${op(',')}${v('x')}`, ['16', '18', '20', '24'], 2, 2, 'The required total is 60. The known numbers total 40, so x = 20.'),
    mathNumber('A value increases 20% and then decreases 20%. It began at 125. What is it now?', `${m('125')}${op('×')}${m('1.2')}${op('×')}${m('0.8')}`, 120, 3, 'The percentage changes are applied to different bases: 125 × 1.2 × 0.8 = 120.'),
    mathChoice('A bag has 4 red, 3 blue, and 2 green marbles. Draw two without replacement. What is the probability they differ in colour?', `${v('P')}${op('(')}${v('different')}${op(')')}`, ['5/9', '2/3', '13/18', '7/9'], 2, 3, 'Of 36 unordered pairs, 10 are same-colour, leaving 26. Thus 26/36 = 13/18.', [frac('5', '9'), frac('2', '3'), frac('13', '18'), frac('7', '9')]),
    mathNumber('Solve for x.', `<mfrac>${v('x')}${m('3')}</mfrac>${op('+')}<mfrac>${v('x')}${m('4')}</mfrac>${op('=')}${m('14')}`, 24, 3, 'Multiply by 12: 4x + 3x = 168, so x = 24.'),
    mathNumber('Three consecutive even integers sum to 90. What is the largest?', `${v('x')}${op('+')}${op('(')}${v('x')}${op('+')}${m('2')}${op(')')}${op('+')}${op('(')}${v('x')}${op('+')}${m('4')}${op(')')}${op('=')}${m('90')}`, 32, 3, 'The integers are 28, 30, and 32.'),
    mathChoice('A group forms 45 distinct pairs. How many people are in the group?', `<mfrac><mrow>${v('n')}${op('(')}${v('n')}${op('−')}${m('1')}${op(')')}</mrow>${m('2')}</mfrac>${op('=')}${m('45')}`, ['9', '10', '11', '12'], 1, 3, 'Ten people form 10 × 9 ÷ 2 = 45 pairs.'),
    mathNumber('Machine A makes 12 parts in 8 minutes; B makes 10 in 12 minutes. Working together, how many parts in 15 minutes?', `${m('15')}${op('×')}${op('(')}<mfrac>${m('12')}${m('8')}</mfrac>${op('+')}<mfrac>${m('10')}${m('12')}</mfrac>${op(')')}`, 35, 3, 'Their combined rate is 3/2 + 5/6 = 7/3 parts per minute. In 15 minutes they make 35 parts.')
  ],
  spatial: [
    pixelChoice('Rotate the first tile one quarter turn clockwise. Which tile results?', [corner, '?'], [reflectGrid(corner), turn(corner, 2), turn(corner, 1), corner], 2, 1, 'The occupied corner moves from upper left to upper right and the long arm rotates with it.', 2),
    pixelChoice('Reflect this tile across a vertical mirror. Which tile results?', [offset, '?'], [turn(offset, 1), offset, reflectGrid(offset), turn(offset, 2)], 2, 1, 'Each filled pixel moves to the same distance from the opposite side.', 2),
    choice('A square is folded along a diagonal. Which original corners meet?', ['Two adjacent corners', 'The two corners on that diagonal', 'The two corners off that diagonal', 'All four corners'], 2, 1, 'The corners away from the fold coincide.'),
    choice('On a grid, move one step right from (2, 3). Where are you?', ['(1, 3)', '(2, 4)', '(3, 3)', '(3, 2)'], 2, 1, 'Moving right increases the x-coordinate.'),
    pixelChoice('The dark pixels in the two tiles are combined. Which tile shows their union?', [blockA, blockB, '?'], [xorGrids(blockA, blockB), overlayGrids(blockA, blockB), blockB, reflectGrid(blockA)], 1, 1, 'A pixel is filled in the answer if it is filled in either input.', 3),
    choice('A square has both diagonals drawn. How many congruent triangular regions are made?', ['2', '4', '6', '8'], 1, 1, 'The diagonals cross at the centre and divide the square into four equal triangles.'),
    choice('Rotate ↗ a quarter turn clockwise. What results?', ['↖', '↘', '↙', '↗'], 1, 2, 'Northeast becomes southeast.'),
    pixelChoice('Apply the same transformation from the top row to the bottom row.', [corner, turn(corner, 1), offset, '?'], [reflectGrid(offset), turn(offset, 2), turn(offset, 1), offset], 2, 2, 'Each right-hand tile is the left-hand tile rotated 90° clockwise.', 2),
    choice('A cube has how many edges?', ['8', '10', '12', '16'], 2, 2, 'A cube has 12 edges.'),
    pixelChoice('Only pixels appearing in one input tile, but not both, remain. Which tile is the result?', [blockA, blockB, '?'], [overlayGrids(blockA, blockB), reflectGrid(blockB), xorGrids(blockA, blockB), blockA], 2, 2, 'Shared pixels cancel; pixels present in exactly one tile remain.', 3),
    choice('From (1, 1), move 2 right, 3 up, then 1 left. Final point?', ['(2, 4)', '(3, 4)', '(2, 3)', '(4, 2)'], 0, 2, '(1 + 2 − 1, 1 + 3) = (2, 4).'),
    pixelChoice('A transparent tile is laid over its vertical reflection. Which combined image appears?', [offset, reflectGrid(offset), '?'], [xorGrids(offset, reflectGrid(offset)), offset, overlayGrids(offset, reflectGrid(offset)), turn(offset, 2)], 2, 2, 'The reflection and original are overlaid; every filled pixel in either tile stays filled.', 3),
    choice('A shape turns 90° clockwise twice. This equals which single turn?', ['90° clockwise', '180°', '270° clockwise', '360°'], 1, 2, 'Two quarter turns make a half turn.'),
    choice('Viewed from above, a stack of cubes is 2 cubes wide and 3 cubes deep. What is its top footprint?', ['2 squares', '3 squares', '5 squares', '6 squares'], 3, 2, 'The footprint is a 2 × 3 rectangle.'),
    pixelChoice('First reflect the tile across a vertical axis, then rotate it a quarter turn clockwise. Which result is correct?', [corner, '?'], [turn(reflectGrid(corner), 1), reflectGrid(turn(corner, 1)), turn(corner, 2), reflectGrid(corner)], 0, 3, 'Transformations must be applied in the stated order: reflect across a vertical axis, then rotate.', 2),
    choice('A cube is painted on every face and cut into 3 × 3 × 3 small cubes. How many have paint on exactly two faces?', ['8', '12', '16', '24'], 1, 3, 'Each of 12 edges has one non-corner cube.'),
    pixelChoice('Across each row, the second tile is a clockwise quarter turn of the first. What completes the lower row?', [offset, turn(offset, 1), blockB, '?'], [turn(blockB, 2), reflectGrid(blockB), blockB, turn(blockB, 1)], 3, 3, 'Rotate the lower left tile 90° clockwise.', 2),
    choice('A 2 × 2 square of unit squares loses its upper-right square. How many unit-length outer edges does the remaining shape have?', ['6', '7', '8', '10'], 2, 3, 'The L-shaped perimeter is 8 unit edges.'),
    choice('A point is rotated 90° counterclockwise about the origin. Where does (2, 1) go?', ['(1, −2)', '(−1, 2)', '(−2, −1)', '(2, −1)'], 1, 3, '(x, y) maps to (−y, x).'),
    choice('A cube has opposite faces A–F, B–E, and C–D. Which face cannot share an edge with B?', ['A', 'C', 'D', 'E'], 3, 3, 'Opposite faces never share an edge.')
  ],
  verbal: [
    choice('Bird is to nest as bee is to…', ['Hive', 'Feather', 'Flower', 'Honey'], 0, 1, 'A hive is a bee’s home.'),
    choice('Which word is closest in meaning to “brief”?', ['Lengthy', 'Short', 'Heavy', 'Late'], 1, 1, 'Brief means short in duration or length.'),
    choice('Which word does not belong?', ['Oak', 'Pine', 'Maple', 'Rose'], 3, 1, 'The first three are trees; a rose is a shrub.'),
    choice('Hot is to cold as bright is to…', ['Light', 'Dim', 'Warm', 'Clear'], 1, 1, 'Each pair consists of opposites.'),
    choice('Author is to book as composer is to…', ['Stage', 'Instrument', 'Symphony', 'Audience'], 2, 1, 'A composer creates a symphony.'),
    choice('Which word is closest in meaning to “rapid”?', ['Swift', 'Quiet', 'Gentle', 'Steady'], 0, 1, 'Rapid means swift.'),
    choice('Seed is to tree as egg is to…', ['Nest', 'Bird', 'Shell', 'Feather'], 1, 2, 'One develops into the other.'),
    choice('Which word is the opposite of “scarce”?', ['Rare', 'Hidden', 'Abundant', 'Small'], 2, 2, 'Abundant means plentiful.'),
    choice('Which word does not belong?', ['Violin', 'Cello', 'Viola', 'Flute'], 3, 2, 'The flute is not a bowed string instrument.'),
    choice('Page is to book as brick is to…', ['Clay', 'Wall', 'House', 'Cement'], 1, 2, 'A wall is assembled from bricks.'),
    choice('“Meticulous” most nearly means…', ['Careless', 'Thorough', 'Immediate', 'Ordinary'], 1, 2, 'Meticulous describes careful attention to detail.'),
    choice('Compass is to direction as thermometer is to…', ['Weather', 'Pressure', 'Temperature', 'Distance'], 2, 2, 'Each instrument measures the stated property.'),
    choice('Which pair has the same relationship as “puppy : dog”?', ['Kitten : cat', 'Cow : milk', 'Bird : wing', 'Tree : leaf'], 0, 2, 'A kitten is a young cat.'),
    choice('“Reluctant” most nearly means…', ['Eager', 'Unwilling', 'Certain', 'Grateful'], 1, 2, 'Reluctant means hesitant or unwilling.'),
    choice('A critique is described as “trenchant.” Which description fits best?', ['Sharp and incisive', 'Gentle and indirect', 'Long but irrelevant', 'Carelessly assembled'], 0, 3, 'A trenchant critique is keen, clear, and forceful.'),
    choice('Tacit is to explicit as provisional is to…', ['Temporary', 'Final', 'Implicit', 'Tentative'], 1, 3, 'Each pair contrasts an unstated or unsettled state with its clear or settled counterpart.'),
    choice('“The findings are suggestive, but the sample is too small to be conclusive.” What is the author claiming?', ['The findings are false', 'The findings prove the claim', 'The findings point toward a claim without settling it', 'The sample has no findings'], 2, 3, 'Suggestive evidence supports a possibility but does not establish it.'),
    choice('A policy is called “anodyne” in a debate. What does that most likely imply?', ['It is deliberately uncontroversial', 'It is impossible to implement', 'It is supported by nobody', 'It is highly technical'], 0, 3, 'Anodyne language avoids giving offence or provoking disagreement.'),
    choice('A study observes that students who sleep more score higher. Which claim goes beyond that observation?', ['Sleep and scores are associated in the sample', 'The study measured sleep', 'More sleep caused the higher scores', 'Some scores were higher than others'], 2, 3, 'An association alone does not establish that sleep caused the difference.'),
    choice('Which pair has the same relationship as “axiom : theorem”?', ['Assumption : deduction', 'Index : book', 'Example : category', 'Question : answer'], 0, 3, 'A theorem is derived from axioms as a deduction is derived from assumptions.')
  ]
}

export const questions: Question[] = sections.flatMap(section => bank[section.id].map((draft, index) => ({ ...draft, id: `${section.id}-${String(index + 1).padStart(2, '0')}`, section: section.id })))
export const questionById = Object.fromEntries(questions.map(question => [question.id, question])) as Record<string, Question>
