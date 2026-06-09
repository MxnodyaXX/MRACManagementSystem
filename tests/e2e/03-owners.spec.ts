import { test, expect } from '@playwright/test'
import { freshSession } from './helpers/auth'

test.describe('Owners — CRUD & display', () => {
  test.beforeEach(async ({ page }) => {
    await freshSession(page)
    await page.goto('/owners')
    await page.waitForTimeout(300)
  })

  test('owners page loads with sample owners', async ({ page }) => {
    await expect(page.locator('text=Kasun Perera')).toBeVisible()
    await expect(page.locator('text=Nimesh Silva')).toBeVisible()
    await expect(page.locator('text=Roshan Fernando')).toBeVisible()
  })

  test('each owner card shows commission rate', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/15%/)
    expect(body).toMatch(/12%/)
  })

  test('owner earnings and payout figures are displayed', async ({ page }) => {
    // Kasun's 4 vehicles have revenues: v1=88k, v3=54k, v6=36k, v10=14k → 192k
    // Page renders abbreviated Rs Xk format, not raw totalEarnings field
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/192k|192,000|192/)
  })

  test('add owner modal opens', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Owner")').first()
    await addBtn.click()
    await page.waitForTimeout(300)
    // The modal form uses <p class="label"> tags — check for the modal title or any label
    await expect(page.locator('text=Full Name').first()).toBeVisible()
  })

  test('add new owner — fills and saves', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Owner")').first()
    await addBtn.click()
    await page.waitForTimeout(300)

    // Inputs in modal order: Full Name, Phone, Email, Address, Bank Account, Commission Rate
    const inputs = page.locator('input.input, input[class*="input"]')

    // Full Name (required)
    await inputs.nth(0).fill('Test Owner EMRAC')
    // Phone
    await inputs.nth(1).fill('0711234567')
    // Email
    await inputs.nth(2).fill('testowner@emrac.lk')

    // Click "Add Owner" submit button inside the modal
    await page.locator('button:has-text("Add Owner")').last().click()
    await page.waitForTimeout(400)

    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Test Owner EMRAC/)
  })

  test('commission rate input is a number field', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Owner")').first()
    await addBtn.click()
    await page.waitForTimeout(300)
    // Commission rate is input[type="number"] in the modal
    const rateInput = page.locator('input[type="number"]').first()
    await expect(rateInput).toBeVisible()
    await expect(rateInput).toHaveAttribute('type', 'number')
  })
})
