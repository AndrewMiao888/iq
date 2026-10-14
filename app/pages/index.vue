<script setup lang="ts">
import { questions, sections, type SectionId } from '~/data/questions'
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
  if (showFinishConfirm.value && event.key === 'Escape') {
    showFinishConfirm.value = false
    return
  }
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
    <header class="site-header wrap">
      <button class="brand" type="button" aria-label="IQ Lab" @click="goHome">
        <span class="brand-symbol">iQ<span>.</span></span>
        <span class="brand-caption">THE THINKING TEST</span>
      </button>
      <nav v-if="phase === 'intro'" class="header-nav" aria-label="Main navigation">
        <a href="#domains">The five parts</a>
        <a href="#method">How it works</a>
      </nav>
      <div v-if="phase === 'test'" class="header-status"><span class="status-dot" /> Test in progress</div>
      <div v-if="phase === 'result'" class="header-status"><span class="status-dot" /> Test complete</div>
      <button v-if="phase === 'intro'" class="header-cta" type="button" @click="startTest">Start the test <span aria-hidden="true">↗</span></button>
      <button v-if="phase === 'test'" class="header-cta muted" type="button" @click="showFinishConfirm = true">Finish test <span aria-hidden="true">↗</span></button>
      <button v-if="phase === 'result'" class="header-cta muted" type="button" @click="startTest">Try again <span aria-hidden="true">↗</span></button>
    </header>

    <main v-if="phase === 'intro'">
      <section class="hero wrap">
        <div class="hero-copy">
          <span class="eyebrow"><span class="eyebrow-dot" /> A FREE COGNITIVE CHALLENGE</span>
          <h1>How sharp is<br>your <em>thinking?</em></h1>
          <p class="hero-lead">A focused test of patterns, logic, numbers, spatial thinking and language. Find out what comes naturally to you.</p>
          <div class="hero-actions">
            <button class="primary-button" type="button" @click="startTest">Start the test <span aria-hidden="true">↗</span></button>
            <a href="#domains" class="text-link">Explore the five parts <span aria-hidden="true">↓</span></a>
          </div>
          <p class="hero-footnote">Free results <span>·</span> No account <span>·</span> About 60 minutes</p>
        </div>
        <div class="hero-display" aria-label="100 questions across five parts">
          <div class="display-top"><span>IQ LAB / 001</span><span>01 — 05</span></div>
          <div class="display-number">100<span>↗</span></div>
          <div class="display-bottom"><strong>QUESTIONS</strong><span>ONE CURIOUS MIND.<br>FIVE WAYS TO THINK.</span></div>
          <div class="display-lines" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </div>
      </section>

      <section class="facts wrap" aria-label="Test facts">
        <div><strong>100</strong><span>questions</span></div>
        <div><strong>05</strong><span>parts</span></div>
        <div><strong>60</strong><span>minutes</span></div>
        <div><strong>$0</strong><span>to see your results</span></div>
      </section>

      <section id="domains" class="domains-section wrap">
        <div class="section-heading"><div><span class="eyebrow">THE TEST</span><h2>Five parts.<br>One clear picture.</h2></div><p>Every part has 20 questions, from straightforward warm-ups to tougher challenges.</p></div>
        <div class="domain-grid">
          <article v-for="(section, index) in sections" :key="section.id" class="domain-card">
            <div class="domain-top"><span>{{ String(index + 1).padStart(2, '0') }} / 05</span><span class="domain-glyph">{{ section.glyph }}</span></div>
            <div><h3>{{ section.name }}</h3><p>{{ section.description }}</p></div>
            <div class="domain-bottom">20 QUESTIONS <span aria-hidden="true">↗</span></div>
          </article>
        </div>
      </section>

      <section id="method" class="method-section wrap">
        <div class="method-intro"><span class="eyebrow light">HOW IT WORKS</span><h2>Just you and<br>your curiosity<span>.</span></h2><p>Take the test in one sitting or refresh and pick up where you left off. Your answers stay in this browser.</p><button class="primary-button" type="button" @click="startTest">Let’s begin <span aria-hidden="true">↗</span></button></div>
        <div class="method-list"><div><span>01</span><p>Work through 100 questions in any order.</p></div><div><span>02</span><p>Keep an eye on the 60-minute clock.</p></div><div><span>03</span><p>Get your score, domain breakdown and answer review for free.</p></div></div>
      </section>
      <p class="fine-print wrap">IQ Lab is a recreational challenge. The IQ-style index is a transparent estimate, not a standardized or diagnostic IQ score.</p>
    </main>

    <main v-else-if="phase === 'test'" class="test-main wrap">
      <div class="test-overview"><div><span class="eyebrow"><span class="eyebrow-dot" /> THE CHALLENGE</span><h1>Stay in the flow.</h1></div><div class="timer" :class="{ urgent: remaining < 300 }"><span>TIME LEFT</span><strong>{{ formatTime(remaining) }}</strong></div></div>
      <div class="progress-panel"><div class="progress-label"><span>{{ answeredCount }} / 100 answered</span><span>{{ progress }}%</span></div><div class="progress-track"><div :style="{ width: `${progress}%` }" /></div></div>
      <nav class="section-nav" aria-label="Test sections"><button v-for="(section, index) in sections" :key="section.id" type="button" :class="{ active: question.section === section.id }" @click="goToSection(section.id)"><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ section.name }}</strong><small>{{ sectionAnswered(section.id) }}/20</small></button></nav>
      <div class="test-content"><div class="question-map"><div class="map-heading"><span>PART {{ String(currentPartIndex + 1).padStart(2, '0') }} / {{ currentSection.name.toUpperCase() }}</span><span>JUMP TO QUESTION</span></div><div class="question-grid"><button v-for="(item, index) in partQuestions" :key="item.id" type="button" :aria-label="`Question ${currentPartIndex * 20 + index + 1}${answers[item.id] ? ', answered' : ''}`" :aria-current="item.id === question.id ? 'step' : undefined" :class="{ current: item.id === question.id, answered: !!answers[item.id] }" @click="goTo(currentPartIndex * 20 + index)">{{ index + 1 }}</button></div></div>
        <section class="question-card" :key="question.id" aria-label="Current question"><div class="question-meta"><span>QUESTION {{ String(currentIndex + 1).padStart(2, '0') }} / 100</span><span>{{ ['','FOUNDATION','INTERMEDIATE','ADVANCED'][question.difficulty] }}</span></div><div class="question-kicker">{{ currentSection.glyph }} &nbsp; {{ currentSection.name }}</div><h2>{{ question.prompt }}</h2>
          <div v-if="question.visual" class="visual-sequence" role="img" :aria-label="`Pattern: ${question.visual.join(', ')}`"><span v-for="(token, index) in question.visual" :key="index" :class="{ mystery: token === '?' }">{{ token }}</span></div>
          <div v-if="question.kind === 'choice'" class="choices" role="group" :aria-label="`Answers for question ${currentIndex + 1}`"><button v-for="(option, index) in question.options" :key="index" type="button" class="choice" :class="{ selected: answers[question.id] === option }" :aria-pressed="answers[question.id] === option" @click="setAnswer(option)"><span class="choice-letter">{{ String.fromCharCode(65 + index) }}</span><span>{{ option }}</span><span class="choice-indicator">{{ answers[question.id] === option ? '✓' : '↗' }}</span></button></div>
          <label v-else class="number-answer"><span>YOUR ANSWER</span><input :value="answers[question.id] ?? ''" type="text" inputmode="decimal" autocomplete="off" placeholder="Type a number" @input="setAnswer(($event.target as HTMLInputElement).value)"><small>Decimals are accepted where relevant.</small></label>
          <div class="question-actions"><button v-if="answers[question.id]" type="button" @click="setAnswer('')">Clear answer</button><span v-else>Choose an answer to mark this question complete.</span></div>
          <div class="question-footer"><button class="secondary-button" type="button" :disabled="currentIndex === 0" @click="goTo(currentIndex - 1)">← &nbsp; Previous</button><span>Press 1–4 to choose · ← → to navigate</span><button class="primary-button" type="button" @click="currentIndex === 99 ? showFinishConfirm = true : goTo(currentIndex + 1)">{{ currentIndex === 99 ? 'View results' : 'Next question' }} <span aria-hidden="true">→</span></button></div>
        </section>
      </div>
    </main>

    <main v-else class="results-main wrap"><div class="result-heading"><span class="eyebrow"><span class="eyebrow-dot" /> SESSION COMPLETE</span><h1>Your mind,<br><em>in numbers.</em></h1><p>A snapshot of how you performed across five different kinds of thinking.</p></div>
      <div class="results-hero"><div class="result-score"><span>YOUR IQ-STYLE INDEX</span><strong>{{ result.iqStyleIndex }}</strong><p>Recreational estimate, not a clinical IQ score.</p></div><div class="result-summary"><span class="eyebrow">YOUR PERFORMANCE</span><h2>{{ result.weightedPercent >= 80 ? 'Exceptional focus.' : result.weightedPercent >= 60 ? 'Strong thinking.' : result.weightedPercent >= 40 ? 'Keep exploring.' : 'Every mind grows.' }}</h2><p>You answered <strong>{{ result.correct }} of 100</strong> questions correctly. Harder questions carried more weight; unanswered questions counted as incorrect.</p><div class="summary-stats"><div><strong>{{ result.weightedPercent }}%</strong><span>weighted score</span></div><div><strong>{{ result.answered }}/100</strong><span>attempted</span></div><div><strong>{{ formatTime(result.elapsedSeconds) }}</strong><span>time used</span></div></div></div></div>
      <div class="results-columns"><section class="breakdown-card"><span class="eyebrow">THE BREAKDOWN</span><h2>Five dimensions.</h2><div v-for="section in result.sections" :key="section.id" class="breakdown-row"><div class="breakdown-label"><strong>{{ section.name }}</strong><span>{{ section.correct }}/20</span></div><div class="breakdown-track"><div :style="{ width: `${section.percent}%` }" /></div><b>{{ section.percent }}%</b></div></section><section class="method-card"><span class="eyebrow">THE METHOD</span><h2>What the number means.</h2><p>Correct answers earn 1, 1.5, or 2 points according to difficulty. The weighted score is points earned divided by points available.</p><p>The IQ-style index adjusts for guessing on multiple-choice questions, then maps the result to a 65–145 display scale. Time does not change the score.</p><div class="method-warning">This test has no population norms or validation study. It cannot measure clinical IQ or reliably compare you with other people.</div></section></div>
      <section class="review-section"><div class="review-heading"><div><span class="eyebrow">GO DEEPER</span><h2>Review your answers.</h2></div><p>Open a part to see your answers and the reasoning behind each question.</p></div><div class="review-list"><div v-for="section in sections" :key="section.id" class="review-part"><button type="button" class="review-toggle" :aria-expanded="openReview === section.id" @click="openReview = openReview === section.id ? null : section.id"><span>{{ section.glyph }}</span><strong>{{ section.name }}</strong><small>{{ result.sections.find(item => item.id === section.id)?.correct }}/20 correct</small><b>{{ openReview === section.id ? '−' : '+' }}</b></button><div v-if="openReview === section.id" class="review-questions"><div v-for="(item, index) in questions.filter(q => q.section === section.id)" :key="item.id" class="review-question"><span>{{ String(index + 1).padStart(2, '0') }}</span><div><h3>{{ item.prompt }} <span v-if="item.visual">{{ item.visual.join('  ') }}</span></h3><p :class="isCorrect(item, answers[item.id]) ? 'answer-right' : 'answer-wrong'">Your answer: {{ answers[item.id] || 'Not answered' }} {{ isCorrect(item, answers[item.id]) ? '✓' : '×' }}</p><p v-if="!isCorrect(item, answers[item.id])">Correct answer: <strong>{{ item.answer }}</strong></p><small>{{ item.explanation }}</small></div></div></div></div></div></section><div class="result-actions"><button class="primary-button" type="button" @click="startTest">Try a new round <span aria-hidden="true">↗</span></button><span>Your latest attempt is saved in this browser.</span></div>
    </main>

    <footer class="site-footer wrap"><div class="footer-brand">iQ<span>.</span> <small>THE THINKING TEST</small></div><p>Founded by Andrew Miao, the creator of SynQuara Digital</p><span>© {{ new Date().getFullYear() }} IQ LAB</span></footer>
    <div v-if="showFinishConfirm" class="modal-backdrop" role="presentation" @click.self="showFinishConfirm = false"><div class="finish-modal" role="dialog" aria-modal="true" aria-labelledby="finish-title"><span class="eyebrow">ONE LAST THING</span><h2 id="finish-title">Finish your test?</h2><p>You’ve answered <strong>{{ answeredCount }} of 100</strong> questions. {{ unanswered ? `${unanswered} unanswered questions will count as incorrect.` : 'Every question has an answer.' }}</p><div class="modal-actions"><button class="secondary-button" type="button" @click="showFinishConfirm = false">Keep going</button><button class="primary-button" type="button" @click="finishTest">See my results <span aria-hidden="true">↗</span></button></div></div></div>
  </div>
</template>
