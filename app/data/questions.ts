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
    sequence(['1', '3', '7', '15', '?'], ['29', '30', '31', '32'], 2, 3, 'Each term is double the previous term plus 1.'),
    sequence(['2', '6', '12', '20', '30', '?'], ['40', '41', '42', '44'], 2, 3, 'Terms are n × (n + 1), so 6 × 7 = 42.'),
    sequence(['A', 'B', 'D', 'G', 'K', '?'], ['O', 'P', 'Q', 'R'], 1, 3, 'Letter jumps are 1, 2, 3, 4, then 5.'),
    sequence(['3', '4', '7', '11', '18', '?'], ['27', '28', '29', '30'], 2, 3, 'Each term is the sum of the two before it.'),
    sequence(['1', '8', '27', '64', '?'], ['100', '121', '125', '144'], 2, 3, 'These are consecutive cubes.'),
    sequence(['5', '11', '23', '47', '?'], ['93', '94', '95', '96'], 2, 3, 'Double and add 1 each time.')
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
    choice('All blue boxes are heavy. No heavy box floats. A blue box is placed in water. What follows?', ['It floats', 'It does not float', 'It turns red', 'Cannot tell'], 1, 3, 'Blue implies heavy, and heavy rules out floating.'),
    choice('If a code is valid, it has a digit. This code has no digit. What follows?', ['It is valid', 'It is invalid', 'It might be valid', 'Every invalid code lacks digits'], 1, 3, 'No digit contradicts a necessary condition for validity.'),
    choice('Exactly one person lied. Ada says “Ben lied.” Ben says “Cy lied.” Cy says “Ben lied.” Who lied?', ['Ada', 'Ben', 'Cy', 'No consistent answer'], 1, 3, 'Ada and Cy make the same claim. If both are truthful, Ben lied and his claim about Cy is false: exactly one liar, Ben.'),
    choice('Nora is either in Room 1 or Room 2. If in Room 1, the lamp is on. The lamp is off. Where is Nora?', ['Room 1', 'Room 2', 'Both rooms', 'Neither room'], 1, 3, 'The lamp being off excludes Room 1.'),
    choice('No inventors are careless. Some explorers are inventors. Which follows?', ['All explorers are careful', 'Some explorers are not careless', 'No explorers are inventors', 'All inventors are explorers'], 1, 3, 'The explorers who are inventors are not careless.'),
    choice('A rule says: if a card has a vowel on one side, it has an even number on the other. Which cards must be turned to test it?', ['A and 4', 'A and 7', 'K and 4', 'K and 7'], 1, 3, 'Check the vowel and the odd number, which could falsify the rule.', ['A', 'K', '4', '7'])
  ],
  numbers: [
    number('What is 18 + 27?', 45, 1, '18 + 27 = 45.'),
    number('What is 15% of 200?', 30, 1, '0.15 × 200 = 30.'),
    number('Solve: 3x = 24. What is x?', 8, 1, 'Divide both sides by 3.'),
    choice('Which fraction is largest?', ['1/2', '3/5', '5/8', '2/3'], 3, 1, '2/3 is approximately 0.667, larger than the others.'),
    number('A box has 4 rows of 6 tiles. How many tiles?', 24, 1, '4 × 6 = 24.'),
    number('What is the average of 6, 8, and 10?', 8, 1, '(6 + 8 + 10) ÷ 3 = 8.'),
    number('A $80 item is discounted by 25%. What is the sale price in dollars?', 60, 2, '25% of 80 is 20; 80 − 20 = 60.'),
    choice('A fair six-sided die is rolled. What is the probability of an even number?', ['1/6', '1/3', '1/2', '2/3'], 2, 2, 'Three of six faces are even.'),
    number('If 5 notebooks cost $15, how much do 8 cost in dollars?', 24, 2, 'Each notebook costs $3; 8 cost $24.'),
    number('Solve: 2x + 7 = 21. What is x?', 7, 2, 'Subtract 7, then divide by 2.'),
    choice('A ratio of red to blue beads is 2:3. If there are 15 blue beads, how many red?', ['6', '10', '12', '20'], 1, 2, 'The scale factor is 5, so red = 2 × 5.'),
    number('A train travels 120 km in 2 hours. At the same speed, how far in 3.5 hours (km)?', 210, 2, 'The speed is 60 km/h; 60 × 3.5 = 210.'),
    number('What is 7 squared minus 5 squared?', 24, 2, '49 − 25 = 24.'),
    choice('What is the median of 3, 9, 2, 11, 7?', ['3', '7', '9', '11'], 1, 2, 'Sorted: 2, 3, 7, 9, 11. The middle is 7.'),
    number('A number increases by 20% to 96. What was the original number?', 80, 3, 'Original × 1.2 = 96, so original = 80.'),
    choice('Two fair coins are flipped. What is the probability of exactly one head?', ['1/4', '1/3', '1/2', '3/4'], 2, 3, 'HT and TH are two of four equally likely outcomes.'),
    number('A rectangle has perimeter 34 and length 10. What is its width?', 7, 3, '2(10 + width) = 34, so width = 7.'),
    number('Three consecutive integers sum to 72. What is the largest?', 25, 3, 'The integers are 23, 24, and 25.'),
    choice('A bag contains 3 red and 2 blue marbles. Draw two without replacement. Probability both are red?', ['1/10', '1/5', '3/10', '2/5'], 2, 3, '(3/5) × (2/4) = 3/10.'),
    number('A machine makes 12 parts in 8 minutes. At that rate, how many parts in 30 minutes?', 45, 3, 'The rate is 1.5 parts/minute; 1.5 × 30 = 45.')
  ],
  spatial: [
    choice('Which direction is a quarter turn clockwise from north?', ['West', 'East', 'South', 'North'], 1, 1, 'Clockwise from north points east.', ['N', 'E', 'S', 'W']),
    choice('Reflect the arrow → in a vertical mirror. Which way does it point?', ['↑', '↓', '←', '→'], 2, 1, 'A vertical mirror reverses left and right.'),
    choice('A square has how many lines of symmetry?', ['2', '3', '4', '8'], 2, 1, 'Two diagonals and two midlines.'),
    choice('On a grid, move one step right from (2, 3). Where are you?', ['(1, 3)', '(2, 4)', '(3, 3)', '(3, 2)'], 2, 1, 'Moving right increases the x-coordinate.'),
    choice('Rotate ↑ by 180°. What results?', ['↑', '→', '↓', '←'], 2, 1, 'A half turn reverses its direction.'),
    choice('Which shape has exactly three corners?', ['Circle', 'Triangle', 'Square', 'Pentagon'], 1, 1, 'A triangle has three vertices.'),
    choice('Rotate ↗ a quarter turn clockwise. What results?', ['↖', '↘', '↙', '↗'], 1, 2, 'Northeast becomes southeast.'),
    choice('Reflect the point (−2, 4) across the vertical y-axis. Where does it land?', ['(−2, −4)', '(2, 4)', '(2, −4)', '(−4, 2)'], 1, 2, 'Reflection across the y-axis changes the sign of x.'),
    choice('A cube has how many edges?', ['8', '10', '12', '16'], 2, 2, 'A cube has 12 edges.'),
    choice('Which net could fold into a cube?', ['Six squares in a straight line', 'Four in a row, with one attached above and one below the second', 'A 2 × 3 rectangle', 'Five squares in a straight line with one on the end'], 1, 2, 'The cross-like net folds without overlapping faces.'),
    choice('From (1, 1), move 2 right, 3 up, then 1 left. Final point?', ['(2, 4)', '(3, 4)', '(2, 3)', '(4, 2)'], 0, 2, '(1 + 2 − 1, 1 + 3) = (2, 4).'),
    choice('Fold a square in half vertically. Punch a hole away from the fold. Unfold it. How many holes?', ['1', '2', '3', '4'], 1, 2, 'The hole appears once on each mirrored half.'),
    choice('A shape turns 90° clockwise twice. This equals which single turn?', ['90° clockwise', '180°', '270° clockwise', '360°'], 1, 2, 'Two quarter turns make a half turn.'),
    choice('Viewed from above, a stack of cubes is 2 cubes wide and 3 cubes deep. What is its top footprint?', ['2 squares', '3 squares', '5 squares', '6 squares'], 3, 2, 'The footprint is a 2 × 3 rectangle.'),
    choice('Reflect (3, −5) across the horizontal x-axis, then across the vertical y-axis. Result?', ['(3, 5)', '(−3, −5)', '(−3, 5)', '(5, −3)'], 2, 3, 'The first reflection changes y; the second changes x.'),
    choice('A cube is painted on every face and cut into 3 × 3 × 3 small cubes. How many have paint on exactly two faces?', ['8', '12', '16', '24'], 1, 3, 'Each of 12 edges has one non-corner cube.'),
    choice('Start facing east. Turn left, then turn 180°, then right. Final direction?', ['North', 'South', 'East', 'West'], 3, 3, 'East → north → south → west.'),
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
    choice('Which word is the opposite of “opaque”?', ['Cloudy', 'Solid', 'Transparent', 'Dense'], 2, 3, 'Transparent material lets light pass through.'),
    choice('Blueprint is to building as recipe is to…', ['Kitchen', 'Meal', 'Ingredient', 'Chef'], 1, 3, 'A plan guides creation of the finished product.'),
    choice('Which word does not belong?', ['Expand', 'Enlarge', 'Amplify', 'Contract'], 3, 3, 'Contract means become smaller; the others mean grow.'),
    choice('“Equivocal” most nearly means…', ['Unambiguous', 'Ambiguous', 'Equal', 'Harsh'], 1, 3, 'Equivocal language is open to more than one interpretation.'),
    choice('If “benevolent” means kind, “malevolent” most nearly means…', ['Generous', 'Harmful', 'Neutral', 'Calm'], 1, 3, 'The prefix mal- changes the sense to wishing harm.'),
    choice('Which pair best matches “premise : conclusion”?', ['Evidence : inference', 'Question : silence', 'Book : cover', 'Cause : coincidence'], 0, 3, 'Evidence supports an inference as a premise supports a conclusion.')
  ]
}

export const questions: Question[] = sections.flatMap(section => bank[section.id].map((draft, index) => ({ ...draft, id: `${section.id}-${String(index + 1).padStart(2, '0')}`, section: section.id })))
export const questionById = Object.fromEntries(questions.map(question => [question.id, question])) as Record<string, Question>
