import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'vue-pivot',
  description: 'Vue pivot table component library',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'Migration', link: '/guide/migration-from-s2' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Architecture', link: '/guide/architecture' },
          { text: 'DataSource & Worker', link: '/guide/datasource-worker' },
          { text: 'Customization', link: '/guide/customization' },
          { text: 'Performance', link: '/guide/performance' },
          { text: 'Migration from S2', link: '/guide/migration-from-s2' },
          { text: 'Capability Matrix', link: '/guide/capability-matrix' },
          { text: 'Performance Baseline', link: '/guide/performance-baseline' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'Overview', link: '/api/' },
          { text: 'PivotSheet', link: '/api/pivot-sheet' },
        ],
      },
    ],
  },
})
