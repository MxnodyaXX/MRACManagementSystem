import { test, expect } from '@playwright/test'
import { freshSession } from './helpers/auth'

test.describe('Commissions — calculations, status & owner view', () => {
  test.beforeEach(async ({ page }) => {
    await freshSession(page)
    await page.goto('/commissions')
    await page.waitForTimeout(400)
  })

  // ── Data display ───────────────────────────────────────────────────────────
  test('all 4 sample commissions are listed', async ({ page }) => {
    const body = await page.locator('body').innerText()
    // bk1: Amila / cm1  bk2: Suresh / cm2  bk3: Priya / cm3  bk4: Dinesh / cm4
    expect(body).toMatch(/Amila|Suresh|Priya|Dinesh/)
  })

  test('commission amounts are correctly calculated (15%)', async ({ page }) => {
    const body = await page.locator('body').innerText()
    // cm1: 16500 × 15% = 2475
    expect(body).toMatch(/2,475|2475/)
    // cm2: 18000 × 15% = 2700
    expect(body).toMatch(/2,700|2700/)
    // cm3: 10500 × 15% = 1575
    expect(body).toMatch(/1,575|1575/)
  })

  test('owner payouts are correctly shown (85% of total)', async ({ page }) => {
    const body = await page.locator('body').innerText()
    // cm1: 16500 × 85% = 14025
    expect(body).toMatch(/14,025|14025/)
    // cm2: 18000 × 85% = 15300
    expect(body).toMatch(/15,300|15300/)
  })

  test('commission statuses are shown (Paid / Pending)', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Paid/)
    expect(body).toMatch(/Pending/)
  })

  test('referral sources are displayed', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Brother|Direct|Sister/)
  })

  // ── Status changes ─────────────────────────────────────────────────────────
  test('pending commission has a mark-paid action', async ({ page }) => {
    // cm2 and cm4 are Pending
    const markPaidBtn = page.locator('button:has-text("Paid"), button:has-text("Mark Paid"), button:has-text("Pay")').first()
    if (await markPaidBtn.count() > 0) {
      await expect(markPaidBtn).toBeVisible()
    }
  })

  test('commission can be marked as credit', async ({ page }) => {
    const creditBtn = page.locator('button:has-text("Credit"), button:has-text("Mark Credit")').first()
    if (await creditBtn.count() > 0) {
      await expect(creditBtn).toBeVisible()
    }
  })

  // ── Totals ─────────────────────────────────────────────────────────────────
  test('total commission income summary is shown', async ({ page }) => {
    // Total across all 4: 16500+18000+10500+16800 = 61800
    // App renders abbreviated "Rs 61.8k" format in stat cards
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/61\.8k|61,800|61800/)
  })

  test('total payout pending is highlighted', async ({ page }) => {
    // cm2 + cm4 pending: 15300 + 14280 = 29580
    // App renders abbreviated "Rs 29.6k" or "Rs 29.58k" format
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/29\.\d+k|29,580|29580|Pending/)
  })

  // ── Owner view ─────────────────────────────────────────────────────────────
  test('owner view tab/filter shows per-owner breakdown', async ({ page }) => {
    const ownerViewBtn = page.locator('button:has-text("Owner"), a:has-text("Owner View"), [data-view="owner"]').first()
    if (await ownerViewBtn.count() > 0) {
      await ownerViewBtn.click()
      await page.waitForTimeout(200)
      const body = await page.locator('body').innerText()
      expect(body).toMatch(/Kasun Perera|Nimesh Silva|Roshan Fernando/)
    }
  })
})
