# Customization

## Slots

- `#data-cell`
- `#row-cell`
- `#col-cell`
- `#corner-cell`

## Theme

通过 CSS 变量覆盖：

```css
:root {
  --vp-accent: #0f6e56;
  --vp-cell-bg: #fff;
  --vp-row-height: 32px;
}
```

## Conditions

```ts
options.conditions = {
  background: [{ field: 'number', mapping: (v) => (Number(v) > 100 ? '#d8f3e7' : undefined) }],
  interval: [{ field: 'number', mapping: (v) => Number(v) / 1000 }],
}
```
