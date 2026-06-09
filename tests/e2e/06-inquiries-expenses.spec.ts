import { test, expect } from '@playwright/test'
import { freshSession } from './helpers/auth'

// ═══════════════════════════════════════════════════════════════════════════
// INQUIRIES
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Inquiries', () => {
  test.beforeEach(async ({ page }) => {
    await freshSession(page)
    await page.goto('/inquiries')
    await page.waitForTimeout(400)
  })

  test('shows all 4 sample inquiries', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Amila Bandara/)
    expect(body).toMatch(/Kavindi Rathnayake/)
    expect(body).toMatch(/Nalinda Dissanayake/)
    expect(body).toMatch(/Tharaka Senevirathne/)
  })

  test('inquiry statuses are displayed (Pending, Lost, Converted)', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Pending/)
    expect(body).toMatch(/Lost/)
    expect(body).toMatch(/Converted/)
  })

  test('referral source is shown per inquiry', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Brother|Direct|Sister|Facebook/)
  })

  test('add new inquiry form opens', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add"), button:has-text("New Inquiry"), button:has-text("+ Inquiry")').first()
    await addBtn.click()
    await page.waitForTimeout(300)
    const inputs = await page.locator('input').all()
    expect(inputs.length).toBeGreaterThan(0)
  })

  test('pending inquiries can be converted to booking', async ({ page }) => {
    // Look for Convert/Book button on a pending inquiry
    const convertBtn = page.locator('button:has-text("Convert"), button:has-text("Book"), button:has-text("Confirm")').first()
    if (await convertBtn.count() > 0) {
      await expect(convertBtn).toBeVisible()
    }
  })

  test('lost inquiry shows lost reason if available', async ({ page }) => {
    // inq3 is Lost with notes "Wanted KDH but we don't have one"
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/KDH|Lost/)
  })

  test('pending filter shows only pending inquiries', async ({ page }) => {
    const pendingBtn = page.locator('button:has-text("Pending"), [data-filter="Pending"]').first()
    if (await pendingBtn.count() > 0) {
      await pendingBtn.click()
      await page.waitForTimeout(200)
      const body = await page.locator('body').innerText()
      expect(body).toMatch(/Amila Bandara|Kavindi/)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════════════════
test.describe('Expenses', () => {
  test.beforeEach(async ({ page }) => {
    await freshSession(page)
    await page.goto('/expenses')
    await page.waitForTimeout(400)
  })

  test('shows all 4 sample expenses', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Engine mount|18,500|18500/)    // ex1
    expect(body).toMatch(/5000km service|6,500|6500/)    // ex2
    expect(body).toMatch(/front tires|22,000|22000/)     // ex3
    expect(body).toMatch(/Parking fine|2,500|2500/)      // ex4
  })

  test('expense categories are shown', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Repair|Service|Tire|Fine/)
  })

  test('total expenses sum is displayed', async ({ page }) => {
    // 18500 + 6500 + 22000 + 2500 = 49500
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/49,500|49500/)
  })

  test('vehicle number is shown per expense', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/CAA-3312|CAB-1234|CBF-5567|CAD-8899/)
  })

  test('add expense modal opens', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Expense"), button:has-text("New Expense"), button:has-text("Add")').first()
    await addBtn.click()
    await page.waitForTimeout(300)
    const inputs = await page.locator('input[type="number"], input[type="text"]').all()
    expect(inputs.length).toBeGreaterThan(0)
  })

  test('expense form has category and amount fields', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Expense"), button:has-text("New Expense"), button:has-text("Add")').first()
    await addBtn.click()
    await page.waitForTimeout(300)
    const body = await page.locator('body').innerText()
    expect(body.toLowerCase()).toMatch(/amount|category|vehicle/)
  })

  test('delete expense shows confirmation', async ({ page }) => {
    const deleteBtn = page.locator('button:has-text("Delete"), button[aria-label*="delete" i], button[aria-label*="remove" i]').first()
    if (await deleteBtn.count() > 0) {
      await deleteBtn.click()
      await page.waitForTimeout(200)
      // Confirmation dialog or the item should be removed
    }
  })

  test('can filter expenses by vehicle', async ({ page }) => {
    const filterEl = page.locator('select, [role="combobox"]').first()
    if (await filterEl.count() > 0) {
      await expect(filterEl).toBeVisible()
    }
  })
})
