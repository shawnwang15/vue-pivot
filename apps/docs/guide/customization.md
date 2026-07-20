# Customization

## Slots

- `#data-cell`
- `#row-cell`
- `#col-cell`
- `#corner-cell`

## Theme

引入样式后，通过覆盖 CSS 变量定制主题。变量定义在 `:root` 与 `.vp-theme` 上，可在任意祖先节点覆盖：

```ts
import { PivotSheet } from '@vue-pivot/vue'
import '@vue-pivot/vue/style.css'
// 或：import '@vue-pivot/vue/theme.css'
```

```css
.vp-theme /* 或任意祖先 */ {
  --vp-accent: #1d4ed8;
  --vp-accent-soft: #dbeafe;
  --vp-cell-bg-selected: #bfdbfe;
}
```

### CSS 变量一览

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `--vp-font-family` | `"IBM Plex Sans", …` | 正文字体 |
| `--vp-font-mono` | `"IBM Plex Mono", …` | 等宽字体 |
| `--vp-bg` | `#f4f8fc` | 表盘背景 |
| `--vp-bg-elevated` | `#ffffff` | 浮层/面板背景 |
| `--vp-border` | `#c5d4e8` | 边框 |
| `--vp-text` | `#1b2430` | 主文字 |
| `--vp-text-muted` | `#5b6775` | 次要文字 |
| `--vp-accent` | `#2f62b5` | 主色（文字、进度条） |
| `--vp-accent-soft` | `#e2eeff` | 主色 soft（chip 底等） |
| `--vp-focus-ring` | `#2f62b5` | 焦点环 |
| `--vp-header-bg` | `#e2eeff` | 列头背景 |
| `--vp-row-header-bg` | `#f7faff` | 行头背景 |
| `--vp-corner-bg` | `#d6e5fa` | 角头背景 |
| `--vp-cell-bg` | `#ffffff` | 单元格背景 |
| `--vp-cell-bg-hover` | `#eef4ff` | 单元格悬停 |
| `--vp-cell-bg-selected` | `#c9dcff` | 单元格选中 |
| `--vp-cell-bg-total` | `#eef3f9` | 汇总行背景 |
| `--vp-grid-line` | `#dde7f2` | 网格线 |
| `--vp-sheet-bg-top` | `#eef4fb` | sheet 渐变顶部 |
| `--vp-sheet-bg-bottom` | `#e7eef8` | sheet 渐变底部 |
| `--vp-tooltip-bg` | `#1b2430` | 提示背景 |
| `--vp-tooltip-fg` | `#ffffff` | 提示文字 |
| `--vp-field-zone-bg` | `#fbfcfd` | 字段区背景 |
| `--vp-interval-track` | `#edf2f7` | interval 轨道 |
| `--vp-row-height` | `32px` | 行高 |
| `--vp-col-width` | `120px` | 列宽 |
| `--vp-row-header-width` | `160px` | 行头宽度 |
| `--vp-shadow` | `0 1px 0 rgba(…)` | 阴影 |

## Conditions

```ts
options.conditions = {
  background: [{ field: 'number', mapping: (v) => (Number(v) > 100 ? '#e2eeff' : undefined) }],
  interval: [{ field: 'number', mapping: (v) => Number(v) / 1000 }],
}
```
