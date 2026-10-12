# iq
# IQ Lab

A free, timed Nuxt 4 thinking challenge with 100 original questions across patterns, logic, numbers, spatial thinking, and verbal reasoning. It includes browser-local session resume, a 60-minute deadline, automatic submission, instant scoring, five-domain results, and answer explanations.

## Run locally

Requires Node 20.19+.

```bash
npm install
npm run dev
```

Open the local URL Nuxt prints. For a production check:

```bash
npm test
npm run typecheck
npm run build
```

Deploy the Nuxt output with a Node server using `node .output/server/index.mjs`, or use your platform's Nuxt preset.

## Scoring

- Correct foundation, intermediate, and advanced answers earn 1, 1.5, and 2 points. Wrong and blank answers earn 0.
- The difficulty-weighted percentage is points earned divided by points available.
- The display index first subtracts the score expected by random guessing on four-option questions (numeric entry questions have no chance credit). The adjusted fraction is clamped to 0–1 and mapped by `round(65 + 80 × adjusted^0.85)` to a 65–145 **IQ-style index**. Time does not affect it.
- The index is a recreational estimate. The test has **not** been normed on a representative population, studied for reliability and validity, or calibrated by age. It is not a clinical IQ score, percentile, diagnosis, or reliable comparison with other people. A standardized IQ interpretation would require that evidence. See the [APA definition of IQ](https://dictionary.apa.org/iq) and the [Standards for Educational and Psychological Testing, Chapter 5](https://www.testingstandards.net/uploads/7/6/6/4/76643089/standards_2014edition.pdf).

All answers and progress are stored only in the browser's local storage. No account, payment, or backend is required.
