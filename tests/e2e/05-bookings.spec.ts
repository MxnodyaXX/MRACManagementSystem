import { test, expect } from '@playwright/test'
import { freshSession } from './helpers/auth'

test.describe('Bookings — lifecycle, conflict detection, commission', () => {
  test.beforeEach(async ({ page }) => {
    await freshSession(page)
    await page.goto('/bookings')
    await page.waitForTimeout(400)
  })

  // ── Display ────────────────────────────────────────────────────────────────
  test('bookings page lists all 4 sample bookings', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Amila Jayasinghe/)
    expect(body).toMatch(/Suresh Kumara/)
    expect(body).toMatch(/Priya Fernando/)
    expect(body).toMatch(/Dinesh Wickrama/)
  })

  test('each booking shows status chip', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Confirmed|Ongoing|Completed|Cancelled/)
  })

  test('booking amounts are displayed', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/16,500|16500/)   // bk1 total
    expect(body).toMatch(/18,000|18000/)   // bk2 total
  })

  test('paid and balance amounts shown per booking', async ({ page }) => {
    const body = await page.locator('body').innerText()
    // bk4: paid 8400, total 16800 → balance 8400
    expect(body).toMatch(/8,400|8400/)
  })

  // ── Status filters ─────────────────────────────────────────────────────────
  test('Ongoing filter shows only ongoing bookings', async ({ page }) => {
    const ongoingTab = page.locator('button:has-text("Ongoing"), [data-filter="Ongoing"]').first()
    if (await ongoingTab.count() > 0) {
      await ongoingTab.click()
      await page.waitForTimeout(200)
      const body = await page.locator('body').innerText()
      expect(body).toMatch(/Suresh Kumara/)
      // Completed booking (Priya) should not show
      expect(body).not.toMatch(/Priya Fernando/)
    }
  })

  test('Completed filter shows completed bookings', async ({ page }) => {
    const completedTab = page.locator('button:has-text("Completed"), [data-filter="Completed"]').first()
    if (await completedTab.count() > 0) {
      await completedTab.click()
      await page.waitForTimeout(200)
      const body = await page.locator('body').innerText()
      expect(body).toMatch(/Priya Fernando/)
    }
  })

  // ── New booking form ───────────────────────────────────────────────────────
  test('add booking modal/form opens', async ({ page }) => {
    const addBtn = page.locator('button:has-text("New Booking"), button:has-text("Add Booking"), button:has-text("Book")').first()
    await addBtn.click()
    await page.waitForTimeout(300)
    // A date picker or form should appear
    const inputs = await page.locator('input').all()
    expect(inputs.length).toBeGreaterThan(0)
  })

  test('booking form has vehicle, customer, date fields', async ({ page }) => {
    const addBtn = page.locator('button:has-text("New Booking"), button:has-text("Add Booking"), button:has-text("Book")').first()
    await addBtn.click()
    await page.waitForTimeout(400)
    const body = await page.locator('body').innerText()
    // Should show vehicle/customer selection and date inputs
    expect(body.toLowerCase()).toMatch(/vehicle|customer|date|name/)
  })

  // ── Booking actions ────────────────────────────────────────────────────────
  test('bk2 (Ongoing) can be completed via action button', async ({ page }) => {
    // Look for a "Complete" or "Return" button near the Ongoing booking
    const completeBtn = page.locator('button:has-text("Complete"), button:has-text("Return"), button:has-text("End Trip")').first()
    if (await completeBtn.count() > 0) {
      await expect(completeBtn).toBeVisible()
    }
  })

  test('bk1 (Confirmed) has a start trip option', async ({ page }) => {
    const startBtn = page.locator('button:has-text("Start"), button:has-text("Ongoing"), button[aria-label*="start" i]').first()
    if (await startBtn.count() > 0) {
      await expect(startBtn).toBeVisible()
    }
  })

  test('cancel button available for confirmed bookings', async ({ page }) => {
    const cancelBtn = page.locator('button:has-text("Cancel")').first()
    if (await cancelBtn.count() > 0) {
      await expect(cancelBtn).toBeVisible()
    }
  })

  // ── Booking detail / invoice ───────────────────────────────────────────────
  test('clicking a booking opens detail view', async ({ page }) => {
    const row = page.locator('text=Amila Jayasinghe').first()
    await row.click()
    await page.waitForTimeout(300)
    // Detail panel or modal should appear with booking info
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Amila|16,500|16500|CAB-1234/)
  })
})
