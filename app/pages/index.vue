<script setup lang="ts">
import { sections, type SectionId } from '~/data/questions'
import { isTestVersionId, questionsForVersion, testVersions, type TestVersionId } from '~/data/testVersions'
import { calculateResult, formatTime, isCorrect, type Answers } from '~/utils/scoring'

type Phase = 'intro' | 'test' | 'result'
type SavedSession = { version: 3; phase: Phase; testVersionId: TestVersionId; startedAt: number; finishedAt: number | null; currentIndex: number; answers: Answers }
type LegacySession = Omit<SavedSession, 'version' | 'testVersionId'> & { version: 2 }
const STORAGE_KEY = 'iq-lab-session-v3'

const phase = ref<Phase>('intro')
const testVersionId = ref<TestVersionId>('100')
const menuOpen = ref(false)
const currentIndex = ref(0)
const answers = ref<Answers>({})
const startedAt = ref<number | null>(null)
const finishedAt = ref<number | null>(null)
const now = ref(Date.now())
const showFinishConfirm = ref(false)
const openReview = ref<SectionId | null>(null)
let ticker: ReturnType<typeof setInterval> | undefined

const testVersion = computed(() => testVersions.find(version => version.id === testVersionId.value)!)
const activeQuestions = computed(() => questionsForVersion(testVersionId.value))
const perSection = computed(() => activeQuestions.value.length / sections.length)
const question = computed(() => activeQuestions.value[currentIndex.value]!)
const currentSection = computed(() => sections.find(section => section.id === question.value.section)!)
const currentPartIndex = computed(() => sections.findIndex(section => section.id === question.value.section))
const partQuestions = computed(() => activeQuestions.value.filter(item => item.section === question.value.section))
const answeredCount = computed(() => activeQuestions.value.filter(item => (answers.value[item.id] ?? '').trim() !== '').length)
const remaining = computed(() => startedAt.value === null ? testVersion.value.durationSeconds : Math.max(0, Math.ceil((startedAt.value + testVersion.value.durationSeconds * 1000 - now.value) / 1000)))
const result = computed(() => calculateResult(answers.value, startedAt.value === null ? 0 : ((finishedAt.value ?? now.value) - startedAt.value) / 1000, activeQuestions.value, testVersion.value.durationSeconds))
const progress = computed(() => Math.round(100 * answeredCount.value / activeQuestions.value.length))
const unanswered = computed(() => activeQuestions.value.length - answeredCount.value)

function persist() {
  if (!import.meta.client || startedAt.value === null) return
  const session: SavedSession = { version: 3, phase: phase.value, testVersionId: testVersionId.value, startedAt: startedAt.value, finishedAt: finishedAt.value, currentIndex: currentIndex.value, answers: answers.value }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)) } catch { /* Storage can be unavailable in private mode. */ }
}

function startTest() {
  menuOpen.value = false
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
  finishedAt.value = Math.min(Date.now(), (startedAt.value ?? Date.now()) + testVersion.value.durationSeconds * 1000)
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
  if (index < 0 || index >= activeQuestions.value.length) return
  currentIndex.value = index
  scrollToTop()
}

function goToSection(id: SectionId) {
  const index = activeQuestions.value.findIndex(item => item.section === id)
  goTo(index)
}

function sectionAnswered(id: SectionId) {
  return activeQuestions.value.filter(item => item.section === id && (answers.value[item.id] ?? '').trim() !== '').length
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
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('iq-lab-session-v2')
    if (raw) {
      const saved = JSON.parse(raw) as SavedSession | LegacySession
      if ((saved.version === 2 || (saved.version === 3 && isTestVersionId(saved.testVersionId))) && Number.isFinite(saved.startedAt) && ['intro', 'test', 'result'].includes(saved.phase) && saved.answers && typeof saved.answers === 'object') {
        testVersionId.value = saved.version === 2 ? '100' : saved.testVersionId
        startedAt.value = saved.startedAt
        finishedAt.value = Number.isFinite(saved.finishedAt) ? saved.finishedAt : null
        currentIndex.value = Math.max(0, Math.min(activeQuestions.value.length - 1, Number(saved.currentIndex) || 0))
        answers.value = Object.fromEntries(Object.entries(saved.answers).filter(([id, value]) => activeQuestions.value.some(item => item.id === id) && typeof value === 'string'))
        phase.value = saved.phase
        if (phase.value === 'test' && Date.now() >= saved.startedAt + testVersion.value.durationSeconds * 1000) {
          finishedAt.value = saved.startedAt + testVersion.value.durationSeconds * 1000
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

watch([phase, testVersionId, currentIndex, answers, startedAt, finishedAt], persist, { deep: true })

useHead({ title: computed(() => phase.value === 'test' ? `Question ${currentIndex.value + 1} · IQ Lab` : phase.value === 'result' ? 'Your results · IQ Lab' : 'IQ Lab — Challenge your thinking') })
</script>

<template>
  <div class="site-shell">
    <header class="site-header wrap">
      <button class="brand" type="button" aria-label="IQ Lab" @click="goHome">
        <img class="brand-mark" src="/mark.svg" alt="" width="40" height="40">
        <span class="brand-lockup"><strong>IQ LAB</strong><small>THE THINKING TEST</small></span>
      </button>
      <nav v-if="phase === 'intro'" id="main-navigation" class="header-nav" :class="{ open: menuOpen }" aria-label="Main navigation">
        <a href="#versions" @click="menuOpen = false"><span>01</span> Test versions</a>
        <a href="#domains" @click="menuOpen = false"><span>02</span> Five parts</a>
        <a href="#method" @click="menuOpen = false"><span>03</span> How it works</a>
        <a href="#contact" @click="menuOpen = false"><span>04</span> Contact</a>
      </nav>
      <div v-if="phase === 'test'" class="header-status"><span class="status-dot" /> Test in progress</div>
      <div v-if="phase === 'result'" class="header-status"><span class="status-dot" /> Test complete</div>
      <a v-if="phase === 'intro'" class="header-cta" href="#versions">Choose a test <span aria-hidden="true">↗</span></a>
      <button v-if="phase === 'test'" class="header-cta muted" type="button" @click="showFinishConfirm = true">Finish test <span aria-hidden="true">↗</span></button>
      <button v-if="phase === 'result'" class="header-cta muted" type="button" @click="startTest()">Try again <span aria-hidden="true">↗</span></button>
      <button v-if="phase === 'intro'" class="nav-toggle" type="button" :aria-expanded="menuOpen" aria-controls="main-navigation" :aria-label="menuOpen ? 'Close menu' : 'Open menu'" @click="menuOpen = !menuOpen"><span /><span /><span /></button>
    </header>

    <main v-if="phase === 'intro'">
      <section class="hero wrap">
        <div class="hero-copy">
          <span class="eyebrow"><span class="eyebrow-dot" /> A FREE COGNITIVE CHALLENGE</span>
          <h1>How sharp is<br>your <em>thinking?</em></h1>
          <p class="hero-lead">A focused test of patterns, logic, numbers, spatial thinking and language. Choose the length that fits your day.</p>
          <div class="hero-actions">
            <a class="primary-button" href="#versions">Choose your test <span aria-hidden="true">↗</span></a>
            <a href="#domains" class="text-link">Explore the five parts <span aria-hidden="true">↓</span></a>
          </div>
          <p class="hero-footnote">Three lengths <span>·</span> Free results <span>·</span> No account</p>
        </div>
        <div class="hero-display" :aria-label="`${testVersion.id} questions across five parts`">
          <div class="display-top"><span>IQ LAB / {{ testVersion.name.toUpperCase() }}</span><span>01 — 05</span></div>
          <div class="display-number">{{ testVersion.id }}<span>↗</span></div>
          <div class="hero-pixel" aria-hidden="true"><PixelGrid grid=".###./#...#/#.#.#/#...#/.####" /></div>
          <div class="display-bottom"><strong>QUESTIONS</strong><span>ONE CURIOUS MIND.<br>FIVE WAYS TO THINK.</span></div>
          <div class="display-lines" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </div>
      </section>

      <section class="facts wrap" aria-label="Test facts">
        <div><strong>03</strong><span>test lengths</span></div>
        <div><strong>05</strong><span>parts</span></div>
        <div><strong>15–60</strong><span>minutes</span></div>
        <div><strong>$0</strong><span>to see your results</span></div>
      </section>

      <section id="versions" class="versions-section wrap">
        <div class="section-heading"><div><span class="eyebrow">CHOOSE YOUR FORMAT</span><h2>Pick your pace.</h2></div><p>Each version covers all five parts. Longer versions give a broader picture of your performance.</p></div>
        <div class="version-grid" role="group" aria-label="Test length">
          <button v-for="version in testVersions" :key="version.id" type="button" class="version-card" :class="{ selected: testVersionId === version.id }" :aria-pressed="testVersionId === version.id" @click="testVersionId = version.id">
            <span class="version-top"><span>{{ version.name.toUpperCase() }}</span><span class="version-radio" aria-hidden="true" /></span>
            <strong>{{ version.id }}<small>questions</small></strong>
            <span class="version-description">{{ version.description }}</span>
            <span class="version-bottom">{{ version.durationSeconds / 60 }} MINUTES <span>{{ version.note }}</span></span>
          </button>
        </div>
        <div class="version-action"><p><strong>{{ testVersion.name }} selected</strong> · {{ testVersion.note }} · {{ testVersion.durationSeconds / 60 }} minutes</p><button class="primary-button" type="button" @click="startTest()">Start {{ testVersion.id }}-question test <span aria-hidden="true">↗</span></button></div>
      </section>

      <section id="domains" class="domains-section wrap">
        <div class="section-heading"><div><span class="eyebrow">THE TEST</span><h2>Five parts.<br>One clear picture.</h2></div><p>Every format draws from the same five domains, from straightforward warm-ups to tougher challenges.</p></div>
        <div class="domain-grid">
          <article v-for="(section, index) in sections" :key="section.id" class="domain-card">
            <div class="domain-top"><span>{{ String(index + 1).padStart(2, '0') }} / 05</span><span class="domain-glyph">{{ section.glyph }}</span></div>
            <div><h3>{{ section.name }}</h3><p>{{ section.description }}</p></div>
            <div class="domain-bottom">{{ perSection }} IN THIS VERSION <span aria-hidden="true">↗</span></div>
          </article>
        </div>
      </section>

      <section id="method" class="method-section wrap">
        <div class="method-intro"><span class="eyebrow light">HOW IT WORKS</span><h2>Just you and<br>your curiosity<span>.</span></h2><p>Take the test in one sitting or refresh and pick up where you left off. Your answers stay in this browser.</p><button class="primary-button" type="button" @click="startTest()">Start {{ testVersion.name.toLowerCase() }} test <span aria-hidden="true">↗</span></button></div>
        <div class="method-list"><div><span>01</span><p>Choose 20, 50 or 100 questions across all five parts.</p></div><div><span>02</span><p>Work in any order before your {{ testVersion.durationSeconds / 60 }}-minute timer ends.</p></div><div><span>03</span><p>Get your score, domain breakdown and answer review for free.</p></div></div>
      </section>
      <section id="contact" class="contact-section wrap"><div><span class="eyebrow">GET IN TOUCH</span><h2>Questions about<br>the questions?</h2><p>Found an unclear item or want to share feedback? Send us a note and include the question number if you can.</p></div><a href="mailto:support@150416.xyz?subject=IQ%20Lab%20feedback" class="contact-link"><span>EMAIL SUPPORT</span><strong>support@150416.xyz</strong><span aria-hidden="true">↗</span></a></section>
      <p class="fine-print wrap">IQ Lab is a recreational challenge. The IQ-style index is a transparent estimate, not a standardized or diagnostic IQ score.</p>
    </main>

    <main v-else-if="phase === 'test'" class="test-main wrap">
      <div class="test-overview"><div><span class="eyebrow"><span class="eyebrow-dot" /> {{ testVersion.name.toUpperCase() }} CHALLENGE · {{ testVersion.id }} QUESTIONS</span><h1>Stay in the flow.</h1></div><div class="timer" :class="{ urgent: remaining < 300 }"><span>TIME LEFT</span><strong>{{ formatTime(remaining) }}</strong></div></div>
      <div class="progress-panel"><div class="progress-label"><span>{{ answeredCount }} / {{ activeQuestions.length }} answered</span><span>{{ progress }}%</span></div><div class="progress-track"><div :style="{ width: `${progress}%` }" /></div></div>
      <nav class="section-nav" aria-label="Test sections"><button v-for="(section, index) in sections" :key="section.id" type="button" :class="{ active: question.section === section.id }" @click="goToSection(section.id)"><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ section.name }}</strong><small>{{ sectionAnswered(section.id) }}/{{ perSection }}</small></button></nav>
      <div class="test-content"><div class="question-map"><div class="map-heading"><span>PART {{ String(currentPartIndex + 1).padStart(2, '0') }} / {{ currentSection.name.toUpperCase() }}</span><span>JUMP TO QUESTION</span></div><div class="question-grid" :class="`count-${perSection}`"><button v-for="(item, index) in partQuestions" :key="item.id" type="button" :aria-label="`Question ${currentPartIndex * perSection + index + 1}${answers[item.id] ? ', answered' : ''}`" :aria-current="item.id === question.id ? 'step' : undefined" :class="{ current: item.id === question.id, answered: !!answers[item.id] }" @click="goTo(currentPartIndex * perSection + index)">{{ index + 1 }}</button></div></div>
        <section class="question-card" :key="question.id" aria-label="Current question">
          <div class="question-meta"><span>QUESTION {{ String(currentIndex + 1).padStart(2, '0') }} / {{ activeQuestions.length }}</span><span>{{ ['','FOUNDATION','INTERMEDIATE','ADVANCED'][question.difficulty] }}</span></div>
          <div class="question-kicker">{{ currentSection.name }} / {{ currentSection.kicker }}</div>
          <h2>{{ question.prompt }}</h2>
          <div v-if="question.math" class="math-expression" v-html="question.math" />
          <div v-if="question.visual" class="visual-sequence" role="img" :aria-label="`Pattern: ${question.visual.join(', ')}`"><span v-for="(token, index) in question.visual" :key="index" :class="{ mystery: token === '?' }">{{ token }}</span></div>
          <div v-if="question.pixel" class="pixel-panels" :style="{ '--panel-columns': question.pixel.columns }" aria-label="Pixel reasoning tiles">
            <div v-for="(panel, index) in question.pixel.panels" :key="index" class="pixel-panel" :class="{ missing: panel === '?' }">
              <span class="pixel-panel-label">{{ String(index + 1).padStart(2, '0') }}</span>
              <strong v-if="panel === '?'" aria-label="Missing tile">?</strong>
              <PixelGrid v-else :grid="panel" />
            </div>
          </div>
          <div v-if="question.kind === 'choice'" class="choices" :class="{ 'pixel-choices': question.pixel }" role="group" :aria-label="`Answers for question ${currentIndex + 1}`">
            <button v-for="(option, index) in question.options" :key="index" type="button" class="choice" :class="{ selected: answers[question.id] === option }" :aria-pressed="answers[question.id] === option" @click="setAnswer(option)">
              <span class="choice-letter">{{ String.fromCharCode(65 + index) }}</span>
              <PixelGrid v-if="question.pixel" :grid="question.pixel.optionGrids[index]!" />
              <span v-else-if="question.optionMath?.[index]" class="choice-math" v-html="question.optionMath[index]" />
              <span v-else>{{ option }}</span>
              <span class="choice-indicator" aria-hidden="true">{{ answers[question.id] === option ? '●' : '○' }}</span>
            </button>
          </div>
          <label v-else class="number-answer"><span>YOUR ANSWER</span><input :value="answers[question.id] ?? ''" type="text" inputmode="decimal" autocomplete="off" placeholder="Type a number" @input="setAnswer(($event.target as HTMLInputElement).value)"><small>Decimals are accepted where relevant.</small></label>
          <div class="question-actions"><button v-if="answers[question.id]" type="button" @click="setAnswer('')">Clear answer</button><span v-else>Choose an answer to mark this question complete.</span></div>
          <div class="question-footer"><button class="secondary-button" type="button" :disabled="currentIndex === 0" @click="goTo(currentIndex - 1)">← &nbsp; Previous</button><span>Press 1–4 to choose · ← → to navigate</span><button class="primary-button" type="button" @click="currentIndex === activeQuestions.length - 1 ? showFinishConfirm = true : goTo(currentIndex + 1)">{{ currentIndex === activeQuestions.length - 1 ? 'View results' : 'Next question' }} <span aria-hidden="true">→</span></button></div>
        </section>
      </div>
    </main>

    <main v-else class="results-main wrap"><div class="result-heading"><span class="eyebrow"><span class="eyebrow-dot" /> {{ testVersion.name.toUpperCase() }} SESSION COMPLETE</span><h1>Your mind,<br><em>in numbers.</em></h1><p>A snapshot of how you performed across five different kinds of thinking.</p></div>
      <div class="results-hero"><div class="result-score"><span>YOUR IQ-STYLE INDEX</span><strong>{{ result.iqStyleIndex }}</strong><p>Recreational estimate for this {{ testVersion.id }}-question version, not a clinical IQ score.</p></div><div class="result-summary"><span class="eyebrow">YOUR PERFORMANCE</span><h2>{{ result.weightedPercent >= 80 ? 'Exceptional focus.' : result.weightedPercent >= 60 ? 'Strong thinking.' : result.weightedPercent >= 40 ? 'Keep exploring.' : 'Every mind grows.' }}</h2><p>You answered <strong>{{ result.correct }} of {{ result.total }}</strong> questions correctly. Harder questions carried more weight; unanswered questions counted as incorrect.</p><div class="summary-stats"><div><strong>{{ result.weightedPercent }}%</strong><span>weighted score</span></div><div><strong>{{ result.answered }}/{{ result.total }}</strong><span>attempted</span></div><div><strong>{{ formatTime(result.elapsedSeconds) }}</strong><span>time used</span></div></div></div></div>
      <div class="results-columns"><section class="breakdown-card"><span class="eyebrow">THE BREAKDOWN</span><h2>Five dimensions.</h2><div v-for="section in result.sections" :key="section.id" class="breakdown-row"><div class="breakdown-label"><strong>{{ section.name }}</strong><span>{{ section.correct }}/{{ section.total }}</span></div><div class="breakdown-track"><div :style="{ width: `${section.percent}%` }" /></div><b>{{ section.percent }}%</b></div></section><section class="method-card"><span class="eyebrow">THE METHOD</span><h2>What the number means.</h2><p>Correct answers earn 1, 1.5, or 2 points according to difficulty. The weighted score is points earned divided by points available.</p><p>The IQ-style index adjusts for guessing on multiple-choice questions, then maps the result to a 65–145 display scale. Time does not change the score.</p><div class="method-warning">This test has no population norms or validation study. It cannot measure clinical IQ or reliably compare you with other people. Scores from different test lengths are not equivalent.</div></section></div>
      <section class="review-section"><div class="review-heading"><div><span class="eyebrow">GO DEEPER</span><h2>Review your answers.</h2></div><p>Open a part to see your answers and the reasoning behind each question.</p></div><div class="review-list"><div v-for="section in sections" :key="section.id" class="review-part"><button type="button" class="review-toggle" :aria-expanded="openReview === section.id" @click="openReview = openReview === section.id ? null : section.id"><span>{{ section.glyph }}</span><strong>{{ section.name }}</strong><small>{{ result.sections.find(item => item.id === section.id)?.correct }}/{{ perSection }} correct</small><b>{{ openReview === section.id ? '−' : '+' }}</b></button><div v-if="openReview === section.id" class="review-questions"><div v-for="(item, index) in activeQuestions.filter(q => q.section === section.id)" :key="item.id" class="review-question"><span>{{ String(index + 1).padStart(2, '0') }}</span><div><h3>{{ item.prompt }} <span v-if="item.visual">{{ item.visual.join('  ') }}</span></h3><div v-if="item.math" class="review-math" v-html="item.math" /><div v-if="item.pixel" class="review-pixels" :style="{ '--panel-columns': item.pixel.columns }"><div v-for="(panel, panelIndex) in item.pixel.panels" :key="panelIndex" class="pixel-panel"><strong v-if="panel === '?'">?</strong><PixelGrid v-else :grid="panel" /></div></div><p :class="isCorrect(item, answers[item.id]) ? 'answer-right' : 'answer-wrong'">Your answer: {{ answers[item.id] || 'Not answered' }} {{ isCorrect(item, answers[item.id]) ? '✓' : '×' }}</p><p v-if="!isCorrect(item, answers[item.id])">Correct answer: <strong>{{ item.answer }}</strong></p><div v-if="item.pixel" class="review-solution"><span>Correct tile</span><PixelGrid :grid="item.pixel.optionGrids[item.options.indexOf(item.answer)]!" /></div><small>{{ item.explanation }}</small></div></div></div></div></div></section><div class="result-actions"><button class="primary-button" type="button" @click="startTest()">Retake the {{ testVersion.name.toLowerCase() }} test <span aria-hidden="true">↗</span></button><span>Your latest attempt is saved in this browser.</span></div>
    </main>

    <footer class="site-footer wrap"><div class="footer-brand"><img src="/mark.svg" alt="" width="28" height="28"><strong>IQ LAB</strong></div><p>Founded by Andrew Miao, the creator of SynQuara Digital</p><a href="mailto:support@150416.xyz">support@150416.xyz</a><span>© {{ new Date().getFullYear() }} IQ LAB</span></footer>
    <div v-if="showFinishConfirm" class="modal-backdrop" role="presentation" @click.self="showFinishConfirm = false"><div class="finish-modal" role="dialog" aria-modal="true" aria-labelledby="finish-title"><span class="eyebrow">ONE LAST THING</span><h2 id="finish-title">Finish your test?</h2><p>You’ve answered <strong>{{ answeredCount }} of {{ activeQuestions.length }}</strong> questions. {{ unanswered ? `${unanswered} unanswered questions will count as incorrect.` : 'Every question has an answer.' }}</p><div class="modal-actions"><button class="secondary-button" type="button" @click="showFinishConfirm = false">Keep going</button><button class="primary-button" type="button" @click="finishTest">See my results <span aria-hidden="true">↗</span></button></div></div></div>
  </div>
</template>
