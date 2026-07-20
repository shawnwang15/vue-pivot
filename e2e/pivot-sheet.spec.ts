import { test, expect } from '@playwright/test'

test.describe('PivotSheet', () => {
  test('renders superstore sheet with grid role', async ({ page }) => {
    await page.goto('/')
    const grid = page.locator('[role="grid"]')
    await expect(grid).toBeVisible()
    await expect(grid).toHaveAttribute('aria-rowcount')
    await expect(grid).toHaveAttribute('aria-colcount')
    await expect(page.locator('.vp-data-grid .vp-cell').first()).toBeVisible()
  })

  test('field panel drag zones exist', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '配置字段' }).click()
    await expect(page.locator('.vp-field-panel')).toBeVisible()
    await expect(page.locator('.vp-field-zone')).toHaveCount(5)
    await expect(page.locator('.vp-field-available')).toContainText('city')
  })

  test('keyboard navigation moves focus selection', async ({ page }) => {
    await page.goto('/')
    const grid = page.locator('[role="grid"]')
    await grid.focus()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.vp-cell.is-selected').first()).toBeVisible()
  })

  test('poc page mounts large matrix virtual grid', async ({ page }) => {
    await page.goto('/poc')
    await expect(page.getByText('5k × 200')).toBeVisible()
    await expect(page.locator('[role="grid"]')).toBeVisible()
    const grid = page.locator('.vp-data-grid')
    await grid.evaluate((el) => {
      el.scrollTop = 2000
      el.scrollLeft = 800
    })
    await expect(page.locator('.vp-data-grid .vp-cell').first()).toBeVisible()
  })

  test('interaction demo brush and export controls', async ({ page }) => {
    await page.goto('/interaction')
    await expect(page.getByRole('button', { name: '导出 Excel' })).toBeVisible()
    const cell = page.locator('.vp-data-grid .vp-cell').first()
    const box = await cell.boundingBox()
    if (box) {
      await page.mouse.move(box.x + 4, box.y + 4)
      await page.mouse.down()
      await page.mouse.move(box.x + 80, box.y + 40)
      await page.mouse.up()
    }
  })
})
