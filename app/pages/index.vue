<script setup lang="ts">
import { questions, sections, type Question, type SectionId } from '~/data/questions'
import { calculateResult, formatTime, isCorrect, TEST_DURATION_SECONDS, type Answers } from '~/utils/scoring'

type Phase = 'intro' | 'test' | 'result'
type SavedSession = { version: 1; phase: Phase; startedAt: number; finishedAt: number | null; currentIndex: number; answers: Answers }
const STORAGE_KEY = 'iq-lab-session-v1'

const phase = ref<Phase>('intro')
const currentIndex = ref(0)
const answers = ref<Answers>({})
const startedAt = ref<number | null>(null)
const finishedAt = ref<number | null>(null)
const now = ref(Date.now())
const showFinishConfirm = ref(false)
const openReview = ref<SectionId | null>(null)
let ticker: ReturnType<typeof setInterval> | undefined

const question = computed(() => questions[currentIndex.value]!)
const currentSection = computed(() => sections.find(section => section.id === question.value.section)!)
const currentPartIndex = computed(() => sections.findIndex(section => section.id === question.value.section))
const partQuestions = computed(() => questions.filter(item => item.section === question.value.section))
const answeredCount = computed(() => questions.filter(item => (answers.value[item.id] ?? '').trim() !== '').length)
const remaining = computed(() => startedAt.value === null ? TEST_DURATION_SECONDS : Math.max(0, Math.ceil((startedAt.value + TEST_DURATION_SECONDS * 1000 - now.value) / 1000)))
const result = computed(() => calculateResult(answers.value, startedAt.value === null ? 0 : ((finishedAt.value ?? now.value) - startedAt.value) / 1000))
const progress = computed(() => Math.round(100 * answeredCount.value / questions.length))
const unanswered = computed(() => questions.length - answeredCount.value)

function persist() {
  if (!import.meta.client || startedAt.value === null) return
  const session: SavedSession = { version: 1, phase: phase.value, startedAt: startedAt.value, finishedAt: finishedAt.value, currentIndex: currentIndex.value, answers: answers.value }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)) } catch { /* Storage can be unavailable in private mode. */ }
}

function startTest() {
  answers.value = {}
  currentIndex.value = 0
  startedAt.value = Date.now()
  finishedAt.value = null
  now.value = startedAt.value
  phase.value = 'test'
  showFinishConfirm.value = false
  openReview.value = null
  persist()
  scrollToTop()
}

function finishTest() {
  if (phase.value !== 'test') return
  finishedAt.value = Math.min(Date.now(), (startedAt.value ?? Date.now()) + TEST_DURATION_SECONDS * 1000)
  phase.value = 'result'
  showFinishConfirm.value = false
  persist()
  scrollToTop()
}

function scrollToTop() {
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goHome() {
  if (phase.value !== 'test') phase.value = 'intro'
  scrollToTop()
}

function setAnswer(value: string) {
  if (phase.value !== 'test') return
  answers.value = { ...answers.value, [question.value.id]: value }
}

function goTo(index: number) {
  if (index < 0 || index >= questions.length) return
  currentIndex.value = index
  scrollToTop()
}

function goToSection(id: SectionId) {
  const index = questions.findIndex(item => item.section === id)
  goTo(index)
}

function sectionAnswered(id: SectionId) {
  return questions.filter(item => item.section === id && (answers.value[item.id] ?? '').trim() !== '').length
}

function onKeydown(event: KeyboardEvent) {
  if (phase.value !== 'test' || showFinishConfirm.value || event.altKey || event.ctrlKey || event.metaKey) return
  const target = event.target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(target.tagName)) return
  if (question.value.kind === 'choice' && /^[1-4]$/.test(event.key)) setAnswer(question.value.options[Number(event.key) - 1] ?? '')
  if (event.key === 'ArrowRight') goTo(currentIndex.value + 1)
  if (event.key === 'ArrowLeft') goTo(currentIndex.value - 1)
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as SavedSession
      if (saved.version === 1 && Number.isFinite(saved.startedAt) && ['intro', 'test', 'result'].includes(saved.phase) && saved.answers && typeof saved.answers === 'object') {
        startedAt.value = saved.startedAt
        finishedAt.value = Number.isFinite(saved.finishedAt) ? saved.finishedAt : null
        currentIndex.value = Math.max(0, Math.min(questions.length - 1, Number(saved.currentIndex) || 0))
        answers.value = Object.fromEntries(Object.entries(saved.answers).filter(([id, value]) => questions.some(item => item.id === id) && typeof value === 'string'))
        phase.value = saved.phase
        if (phase.value === 'test' && Date.now() >= saved.startedAt + TEST_DURATION_SECONDS * 1000) {
          finishedAt.value = saved.startedAt + TEST_DURATION_SECONDS * 1000
          phase.value = 'result'
          persist()
        }
      }
    }
  } catch { /* A bad saved session simply starts fresh. */ }
  now.value = Date.now()
  ticker = setInterval(() => {
    now.value = Date.now()
    if (phase.value === 'test' && remaining.value <= 0) finishTest()
  }, 1000)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (ticker) clearInterval(ticker)
  if (import.meta.client) window.removeEventListener('keydown', onKeydown)
})

watch([phase, currentIndex, answers, startedAt, finishedAt], persist, { deep: true })

useHead({ title: computed(() => phase.value === 'test' ? `Question ${currentIndex.value + 1} · IQ Lab` : phase.value === 'result' ? 'Your results · IQ Lab' : 'IQ Lab — Challenge your thinking') })
</script>

<template>
  <div class="site-shell">
    <div class="ambient ambient-one" aria-hidden="true" />
    <div class="ambient ambient-two" aria-hidden="true" />
    <header class="site-header wrap">
      <button class="brand" type="button" aria-label="IQ Lab" @click="goHome">
        <span class="brand-mark"><span>i</span><span>Q</span></span>
        <span class="brand-word">IQ<span>LAB</span><small>THE THINKING EXPERIMENT</small></span>
      </button>
      <nav v-if="phase === 'intro'" class="header-nav" aria-label="Main navigation">
        <a href="#domains">The challenge</a>
        <a href="#method">How scoring works</a>
      </nav>
      <div v-if="phase === 'test'" class="header-status"><span class="live-dot" /> SESSION IN PROGRESS</div>
      <div v-if="phase === 'result'" class="header-status"><span class="live-dot complete-dot" /> SESSION COMPLETE</div>
      <button v-if="phase === 'intro'" class="header-cta" type="button" @click="startTest">Start free test <span>↗</span></button>
      <button v-if="phase === 'test'" class="header-cta header-cta-subtle" type="button" @click="showFinishConfirm = true">Finish test <span>↗</span></button>
      <button v-if="phase === 'result'" class="header-cta header-cta-subtle" type="button" @click="startTest">Try again <span>↗</span></button>
    </header>

    <main v-if="phase === 'intro'">
      <section class="hero wrap">
        <div class="hero-copy">
          <div class="eyebrow"><span class="eyebrow-line" /> FREE COGNITIVE CHALLENGE <span class="eyebrow-star">✦</span> 2026 EDITION</div>
          <h1>Think <em>deeper.</em><br>See <span>further.</span></h1>
          <p class="hero-lead">100 questions. Five dimensions of thinking. One hour to see what your mind can do.</p>
          <div class="hero-actions">
            <button class="primary-button" type="button" @click="startTest">Begin the challenge <span>↗</span></button>
            <a class="text-link" href="#domains">Explore the test <span>↓</span></a>
          </div>
          <div class="hero-footnote"><span class="mini-check">✓</span> No account <span class="dot-separator">·</span> No payment <span class="dot-separator">·</span> Results instantly</div>
        </div>
        <div class="hero-art" aria-label="Five cognitive dimensions represented by an abstract orbit graphic">
          <div class="art-grid" />
          <div class="orbit orbit-outer" /><div class="orbit orbit-mid" /><div class="orbit orbit-inner" />
          <div class="orbit-core"><span class="core-spark">✳</span><strong>IQ</strong><small>LAB</small></div>
          <span class="orbit-node node-one">◈</span><span class="orbit-node node-two">⌗</span><span class="orbit-node node-three">◇</span><span class="orbit-node node-four">✳</span><span class="orbit-node node-five">⬡</span>
          <div class="art-float float-top"><span class="float-icon">✳</span><span><small>YOUR MIND, MAPPED</small><strong>05 dimensions</strong></span></div>
          <div class="art-float float-bottom"><span class="pulse-bars"><i /><i /><i /><i /><i /></span><span><small>THE FULL CHALLENGE</small><strong>100 questions</strong></span></div>
          <span class="art-cross cross-one">+</span><span class="art-cross cross-two">+</span>
        </div>
      </section>

      <section class="metrics wrap" aria-label="Test facts">
        <div><strong>100<span>.</span></strong><small>ORIGINAL QUESTIONS</small></div>
        <div><strong>05<span>/</span></strong><small>COGNITIVE DOMAINS</small></div>
        <div><strong>60<span>m</span></strong><small>ON THE CLOCK</small></div>
        <div><strong>$0<span>.</span></strong><small>TO SEE YOUR SCORE</small></div>
      </section>

      <section id="domains" class="domains-section wrap">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line" /> THE FIVE DIMENSIONS</div><h2>Different ways<br><em>to be brilliant.</em></h2></div><p>Move through five focused parts, each with 20 questions and a mix of accessible starts and demanding finishes.</p></div>
        <div class="domain-grid">
          <article v-for="(section, index) in sections" :key="section.id" class="domain-card" :class="`domain-${section.id}`">
            <div class="domain-top"><span>{{ String(index + 1).padStart(2, '0') }} / 05</span><span class="domain-glyph">{{ section.glyph }}</span></div>
            <div><h3>{{ section.name }}</h3><p>{{ section.description }}</p></div>
            <div class="domain-bottom"><span>20 QUESTIONS</span><span>↗</span></div>
          </article>
        </div>
      </section>

      <section id="method" class="method-section wrap">
        <div class="method-copy"><div class="eyebrow"><span class="eyebrow-line" /> THE PROTOCOL</div><h2>A better way to<br><em>challenge yourself.</em></h2><p>Take the test at your own pace within the 60-minute clock. Your answers are saved in this browser, so a refresh won’t erase your progress.</p><button class="primary-button" type="button" @click="startTest">Start your test <span>↗</span></button></div>
        <div class="method-steps"><div><span>01</span><div><h3>Work through 100 questions</h3><p>Patterns, logic, numbers, spatial thinking, and language.</p></div></div><div><span>02</span><div><h3>Beat your own clock</h3><p>Navigate freely. The test submits when the hour runs out.</p></div></div><div><span>03</span><div><h3>Get the full picture, free</h3><p>See accuracy, difficulty-weighted results, domain breakdowns, and every answer.</p></div></div></div>
      </section>
      <div class="fine-print wrap">IQ Lab is a recreational challenge. Its IQ-style index is a transparent estimate from your answers, not a standardized or diagnostic IQ score.</div>
    </main>

    <main v-else-if="phase === 'test'" class="test-main wrap">
      <div class="test-topline"><div><span class="eyebrow"><span class="eyebrow-line" /> THE CHALLENGE IS LIVE</span><h1>Stay curious. <em>Keep going.</em></h1></div><div class="timer" :class="{ 'timer-urgent': remaining < 300 }"><span>◷</span><div><small>TIME REMAINING</small><strong>{{ formatTime(remaining) }}</strong></div></div></div>
      <div class="progress-panel"><div class="progress-label"><span><strong>{{ answeredCount }}</strong> / 100 answered</span><span>{{ progress }}% complete</span></div><div class="progress-track"><div :style="{ width: `${progress}%` }" /></div></div>
      <div class="test-grid">
        <aside class="test-sidebar" aria-label="Question navigation">
          <div class="sidebar-title">YOUR PATH <span>05 PARTS</span></div>
          <button v-for="(section, index) in sections" :key="section.id" class="section-tab" :class="{ active: question.section === section.id }" type="button" @click="goToSection(section.id)"><span class="section-tab-glyph">{{ section.glyph }}</span><span class="section-tab-text"><small>PART {{ String(index + 1).padStart(2, '0') }}</small><strong>{{ section.name }}</strong></span><span class="section-count">{{ sectionAnswered(section.id) }}/20</span></button>
          <div class="question-grid-heading">PART {{ String(currentPartIndex + 1).padStart(2, '0') }} QUESTIONS</div>
          <div class="question-grid"><button v-for="(item, index) in partQuestions" :key="item.id" type="button" :aria-label="`Question ${currentPartIndex * 20 + index + 1}${answers[item.id] ? ', answered' : ''}`" :class="{ current: item.id === question.id, answered: !!answers[item.id] }" @click="goTo(currentPartIndex * 20 + index)">{{ index + 1 }}</button></div>
          <div class="sidebar-tip"><span>✳</span><p>Tip: press <kbd>1</kbd>–<kbd>4</kbd> to answer choices, or use arrow keys to move.</p></div>
        </aside>
        <section class="question-card" :key="question.id" aria-label="Current question">
          <div class="question-card-top"><div class="question-index">QUESTION <strong>{{ String(currentIndex + 1).padStart(2, '0') }}</strong> <span>/ 100</span></div><div class="difficulty" :class="`difficulty-${question.difficulty}`"><span v-for="n in 3" :key="n" :class="{ lit: n <= question.difficulty }">◆</span> {{ ['','FOUNDATION','INTERMEDIATE','ADVANCED'][question.difficulty] }}</div></div>
          <div class="question-part"><span>{{ currentSection.glyph }}</span><div><small>{{ currentSection.kicker }}</small><strong>{{ currentSection.name }}</strong></div></div>
          <h2>{{ question.prompt }}</h2>
          <div v-if="question.visual" class="visual-sequence" role="img" :aria-label="`Pattern: ${question.visual.join(', ')}`"><span v-for="(token, index) in question.visual" :key="index" :class="{ mystery: token === '?' }">{{ token }}</span></div>
          <div v-if="question.kind === 'choice'" class="choices" role="group" :aria-label="`Answers for question ${currentIndex + 1}`"><button v-for="(option, index) in question.options" :key="index" type="button" class="choice" :class="{ selected: answers[question.id] === option }" :aria-pressed="answers[question.id] === option" @click="setAnswer(option)"><span class="choice-letter">{{ String.fromCharCode(65 + index) }}</span><span>{{ option }}</span><span class="choice-indicator">{{ answers[question.id] === option ? '✓' : '↗' }}</span></button></div>
          <label v-else class="number-answer"><span>YOUR ANSWER</span><input :value="answers[question.id] ?? ''" type="text" inputmode="decimal" autocomplete="off" placeholder="Type a number" @input="setAnswer(($event.target as HTMLInputElement).value)"><small>Enter a number. Decimals are accepted where relevant.</small></label>
          <div class="question-actions"><button v-if="answers[question.id]" class="clear-answer" type="button" @click="setAnswer('')">Clear answer</button><span v-else>Choose an answer to mark this question complete.</span></div>
          <div class="question-footer"><button class="secondary-button" type="button" :disabled="currentIndex === 0" @click="goTo(currentIndex - 1)"><span>←</span> Previous</button><span>PART {{ String(currentPartIndex + 1).padStart(2, '0') }} OF 05</span><button class="primary-button" type="button" @click="currentIndex === 99 ? showFinishConfirm = true : goTo(currentIndex + 1)">{{ currentIndex === 99 ? 'View results' : 'Next question' }} <span>→</span></button></div>
        </section>
      </div>
    </main>

    <main v-else class="results-main wrap">
      <div class="result-heading"><div class="eyebrow"><span class="eyebrow-line" /> YOUR RESULTS ARE IN</div><h1>Meet your <em>mind.</em></h1><p>Here’s how you performed across all five dimensions.</p></div>
      <div class="results-hero"><div class="result-score"><div class="score-ring" :style="{ '--score-angle': `${result.chanceAdjustedPercent * 3.6}deg` }"><div><small>IQ-STYLE INDEX</small><strong>{{ result.iqStyleIndex }}</strong><span>out of 145</span></div></div><p>Recreational estimate · not a clinical IQ score</p></div><div class="result-summary"><div class="summary-eyebrow">YOUR PERFORMANCE SNAPSHOT <span>✳</span></div><h2>{{ result.weightedPercent >= 80 ? 'Exceptional focus.' : result.weightedPercent >= 60 ? 'Strong thinking.' : result.weightedPercent >= 40 ? 'Keep exploring.' : 'Every mind grows.' }}</h2><p>You answered <strong>{{ result.correct }} of 100</strong> questions correctly. Harder questions carried more weight in your score, and unanswered questions counted as incorrect.</p><div class="summary-stats"><div><strong>{{ result.weightedPercent }}%</strong><small>WEIGHTED SCORE</small></div><div><strong>{{ result.answered }}/100</strong><small>ATTEMPTED</small></div><div><strong>{{ formatTime(result.elapsedSeconds) }}</strong><small>TIME USED</small></div></div></div></div>
      <div class="results-columns"><section class="breakdown-card"><div class="card-heading"><div><span class="eyebrow">THE BREAKDOWN</span><h2>Five dimensions.</h2></div><span class="heading-mark">◈</span></div><div v-for="section in result.sections" :key="section.id" class="breakdown-row"><div class="breakdown-label"><span>{{ sections.find(item => item.id === section.id)?.glyph }}</span><strong>{{ section.name }}</strong><small>{{ section.correct }}/20 correct</small></div><div class="breakdown-track"><div :style="{ width: `${section.percent}%` }" /></div><b>{{ section.percent }}%</b></div></section><section class="method-card"><span class="eyebrow">BEHIND THE NUMBER</span><h2>How this score works.</h2><p>Correct answers earn 1, 1.5, or 2 points for foundation, intermediate, and advanced questions. The weighted score is points earned divided by points available.</p><p>The IQ-style index adjusts for the expected chance score on four-option questions, then maps the result to a 65–145 display scale. Time does not change your score.</p><div class="method-warning"><span>ⓘ</span><p>This test has no population norms or validation study. The index cannot measure clinical IQ or compare you reliably with other people.</p></div></section></div>
      <section class="review-section"><div class="review-heading"><div><span class="eyebrow">LEARN FROM EVERY ANSWER</span><h2>Question review.</h2></div><p>Open a part to see your answers and the reasoning behind each question.</p></div><div class="review-list"><div v-for="section in sections" :key="section.id" class="review-part"><button type="button" class="review-toggle" :aria-expanded="openReview === section.id" @click="openReview = openReview === section.id ? null : section.id"><span class="review-glyph">{{ section.glyph }}</span><strong>{{ section.name }}</strong><span>{{ result.sections.find(item => item.id === section.id)?.correct }}/20 correct</span><span class="review-chevron">{{ openReview === section.id ? '−' : '+' }}</span></button><div v-if="openReview === section.id" class="review-questions"><div v-for="(item, index) in questions.filter(q => q.section === section.id)" :key="item.id" class="review-question"><span class="review-number">{{ String(index + 1).padStart(2, '0') }}</span><div><h3>{{ item.prompt }} <span v-if="item.visual">{{ item.visual.join('  ') }}</span></h3><p :class="isCorrect(item, answers[item.id]) ? 'answer-right' : 'answer-wrong'">Your answer: {{ answers[item.id] || 'Not answered' }} <span>{{ isCorrect(item, answers[item.id]) ? '✓' : '×' }}</span></p><p v-if="!isCorrect(item, answers[item.id])">Correct answer: <strong>{{ item.answer }}</strong></p><small>{{ item.explanation }}</small></div></div></div></div></div></section>
      <div class="result-actions"><button class="primary-button" type="button" @click="startTest">Take it again <span>↗</span></button><span>Your latest attempt is saved in this browser.</span></div>
    </main>

    <footer class="site-footer wrap"><div class="footer-brand"><span class="brand-mark small"><span>i</span><span>Q</span></span><div><strong>IQ LAB</strong><small>STAY CURIOUS.</small></div></div><p>Founded by Andrew Miao, the creator of SynQuara Digital</p><span>© {{ new Date().getFullYear() }} IQ LAB</span></footer>

    <div v-if="showFinishConfirm" class="modal-backdrop" role="presentation" @click.self="showFinishConfirm = false"><div class="finish-modal" role="dialog" aria-modal="true" aria-labelledby="finish-title"><div class="modal-icon">✳</div><span class="eyebrow">READY WHEN YOU ARE</span><h2 id="finish-title">Finish your test?</h2><p>You’ve answered <strong>{{ answeredCount }} of 100</strong> questions. {{ unanswered ? `${unanswered} unanswered questions will count as incorrect.` : 'Every question has an answer.' }}</p><div class="modal-actions"><button class="secondary-button" type="button" @click="showFinishConfirm = false">Keep going</button><button class="primary-button" type="button" @click="finishTest">See my results <span>↗</span></button></div></div></div>
  </div>
</template>
