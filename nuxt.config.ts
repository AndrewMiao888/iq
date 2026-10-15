export default defineNuxtConfig({
  compatibilityDate: '2026-10-13',
  devtools: { enabled: false },
  typescript: { tsConfig: { compilerOptions: { allowImportingTsExtensions: true } } },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'IQ Lab — Challenge your thinking',
      meta: [
        { name: 'description', content: '100 original questions across five cognitive domains. Take the free timed challenge and explore your results.' },
        { name: 'theme-color', content: '#14243c' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/svg+xml', href: '/mark.svg' }
      ]
    }
  }
})
