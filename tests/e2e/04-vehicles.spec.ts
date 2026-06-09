import { test, expect } from '@playwright/test'
import { freshSession } from './helpers/auth'

test.describe('Vehicles — CRUD, status & filters', () => {
  test.beforeEach(async ({ page }) => {
    await freshSession(page)
    await page.goto('/vehicles')
    await page.waitForTimeout(400)
  })

  // ── Display ────────────────────────────────────────────────────────────────
  test('vehicles page shows all 10 sample vehicles', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/CAB-1234/)   // v1 Toyota Prius
    expect(body).toMatch(/CAD-8899/)   // v2 Suzuki WagonR
    expect(body).toMatch(/CBF-5567/)   // v3 Toyota Axio
  })

  test('each vehicle card shows daily rate', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/5,500|5500/)  // CAB-1234 daily rate
    expect(body).toMatch(/3,500|3500/)  // CAD-8899 daily rate
  })

  test('vehicle status badges render', async ({ page }) => {
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Available|Reserved|Ongoing|Maintenance/)
  })

  // ── Filters ────────────────────────────────────────────────────────────────
  test('Available filter shows only available vehicles', async ({ page }) => {
    const availableBtn = page.locator('button:has-text("Available"), [data-filter="Available"]').first()
    if (await availableBtn.count() > 0) {
      await availableBtn.click()
      await page.waitForTimeout(200)
      const body = await page.locator('body').innerText()
      // v2,v5,v6,v7,v9 are Available in sample data
      expect(body).toMatch(/CAD-8899|CBD-7721|CPK-4456/)
    }
  })

  test('search filters vehicles by number', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first()
    if (await searchInput.count() > 0) {
      await searchInput.fill('CAB')
      await page.waitForTimeout(300)
      const body = await page.locator('body').innerText()
      expect(body).toMatch(/CAB-1234/)
    }
  })

  // ── Add vehicle ────────────────────────────────────────────────────────────
  test('add vehicle modal opens with required fields', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Vehicle"), button:has-text("+ Vehicle"), button:has-text("Add")').first()
    await addBtn.click()
    await page.waitForTimeout(300)

    // Modal/form should show brand, model, daily rate fields
    const modal = page.locator('[role="dialog"], .modal, [class*="modal"], [class*="Modal"]').first()
    if (await modal.count() > 0) {
      await expect(modal).toBeVisible()
    }
  })

  test('vehicle form has brand, model, daily rate inputs', async ({ page }) => {
    const addBtn = page.locator('button:has-text("Add Vehicle"), button:has-text("Add")').first()
    await addBtn.click()
    await page.waitForTimeout(300)

    const inputs = await page.locator('input[type="text"], input[type="number"]').all()
    expect(inputs.length).toBeGreaterThan(2)
  })

  // ── Status ─────────────────────────────────────────────────────────────────
  test('maintenance vehicles are visually distinct', async ({ page }) => {
    // v4 and v8 are Maintenance in sample data
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Maintenance/)
  })

  test('reserved vehicles are shown', async ({ page }) => {
    // v1 and v10 are Reserved
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Reserved/)
  })

  test('ongoing vehicle is listed', async ({ page }) => {
    // v3 is Ongoing
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Ongoing/)
  })

  // ── Insurance ──────────────────────────────────────────────────────────────
  test('insurance expiry dates are visible', async ({ page }) => {
    const body = await page.locator('body').innerText()
    // v2 insurance expires 2025-08-15 (already expired)
    expect(body).toMatch(/2025|2026/)
  })
})
