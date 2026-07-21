import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'vue-pivot',
  description: 'Vue pivot table component library',
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: '从 S2 迁移', link: '/guide/migration-from-s2' },
    ],
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '架构说明', link: '/guide/architecture' },
          { text: 'DataSource 与 Worker', link: '/guide/datasource-worker' },
          { text: 'Aggregated 模式', link: '/guide/aggregated-mode' },
          { text: '明细表 Table', link: '/guide/table-sheet' },
          { text: '定制与主题', link: '/guide/customization' },
          { text: '性能', link: '/guide/performance' },
          { text: '从 S2 迁移', link: '/guide/migration-from-s2' },
          { text: '能力矩阵', link: '/guide/capability-matrix' },
          { text: '性能基线', link: '/guide/performance-baseline' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: '概览', link: '/api/' },
          { text: 'DataCfg', link: '/api/data-cfg' },
          { text: 'PivotOptions', link: '/api/options' },
          { text: 'PivotSheet', link: '/api/pivot-sheet' },
        ],
      },
    ],
  },
})
