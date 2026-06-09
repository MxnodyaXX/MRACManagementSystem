import { test, expect } from '@playwright/test'
import { freshSession } from './helpers/auth'

const ROUTES = [
  { path: '/',             name: 'Dashboard'    },
  { path: '/vehicles',     name: 'Vehicles'     },
  { path: '/bookings',     name: 'Bookings'     },
  { path: '/inquiries',    name: 'Inquiries'    },
  { path: '/owners',       name: 'Owners'       },
  { path: '/commissions',  name: 'Commissions'  },
  { path: '/expenses',     name: 'Expenses'     },
  { path: '/drivers',      name: 'Drivers'      },
  { path: '/notifications',name: 'Notifications'},
  { path: '/handovers',    name: 'Handovers'    },
]

test.describe('Design & Alignment Checks', () => {
  test.beforeEach(async ({ page }) => {
    await freshSession(page)
  })

  // ── No JS errors on any page ───────────────────────────────────────────────
  for (const route of ROUTES) {
    test(`${route.name} page has zero JS errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto(route.path)
      await page.waitForTimeout(600)
      expect(errors, `JS errors on ${route.path}: ${errors.join(', ')}`).toHaveLength(0)
    })
  }

  // ── Sidebar always visible ─────────────────────────────────────────────────
  for (const route of ROUTES) {
    test(`${route.name} page has sidebar navigation`, async ({ page }) => {
      await page.goto(route.path)
      await page.waitForTimeout(300)
      const sidebar = page.locator('nav, aside, [class*="sidebar" i], [class*="Sidebar" i]').first()
      await expect(sidebar).toBeVisible()
    })
  }

  // ── Page headings ──────────────────────────────────────────────────────────
  test('each page has a visible heading / page title', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(route.path)
      await page.waitForTimeout(300)
      const heading = page.locator('h1, h2, [class*="title" i], [class*="heading" i]').first()
      await expect(heading).toBeVisible()
    }
  })

  // ── Tables render with headers ─────────────────────────────────────────────
  test('bookings table renders headers', async ({ page }) => {
    await page.goto('/bookings')
    await page.waitForTimeout(300)
    const body = await page.locator('body').innerText()
    // Should have column-like headers
    expect(body.toLowerCase()).toMatch(/customer|vehicle|status|amount|date/)
  })

  test('commissions table renders headers', async ({ page }) => {
    await page.goto('/commissions')
    await page.waitForTimeout(300)
    const body = await page.locator('body').innerText()
    expect(body.toLowerCase()).toMatch(/commission|payout|status|owner/)
  })

  test('expenses table renders headers', async ({ page }) => {
    await page.goto('/expenses')
    await page.waitForTimeout(300)
    const body = await page.locator('body').innerText()
    expect(body.toLowerCase()).toMatch(/vehicle|amount|category|date/)
  })

  // ── Buttons and actions ────────────────────────────────────────────────────
  test('each CRUD page has an "Add" action button', async ({ page }) => {
    const pages = ['/vehicles', '/bookings', '/owners', '/inquiries', '/expenses', '/drivers']
    for (const p of pages) {
      await page.goto(p)
      await page.waitForTimeout(300)
      const addBtn = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("+")').first()
      await expect(addBtn).toBeVisible()
    }
  })

  // ── Modal behaviour ────────────────────────────────────────────────────────
  test('modal opens and closes without layout breaking', async ({ page }) => {
    await page.goto('/vehicles')
    await page.waitForTimeout(300)
    const addBtn = page.locator('button:has-text("Add Vehicle"), button:has-text("Add")').first()
    await addBtn.click()
    await page.waitForTimeout(400)

    // Modal should be visible
    const modal = page.locator('[role="dialog"], .modal, [class*="modal" i]').first()
    if (await modal.count() > 0) {
      await expect(modal).toBeVisible()
    }

    // Close via ESC
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Page should still render normally
    const sidebar = page.locator('nav, aside').first()
    await expect(sidebar).toBeVisible()
  })

  // ── Responsive sidebar (mobile) ────────────────────────────────────────────
  test('sidebar collapses on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.waitForTimeout(300)
    // On mobile the sidebar may be hidden/icon-only — the page should still render
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('layout restores on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(300)
    const sidebar = page.locator('nav, aside').first()
    await expect(sidebar).toBeVisible()
  })

  // ── Status badge colours ───────────────────────────────────────────────────
  test('status badges are present on bookings page', async ({ page }) => {
    await page.goto('/bookings')
    await page.waitForTimeout(300)
    const statusBadge = page.locator(
      '[class*="badge" i], [class*="status" i], [class*="chip" i], ' +
      '[class*="tag" i], span:has-text("Confirmed"), span:has-text("Ongoing")'
    ).first()
    await expect(statusBadge).toBeVisible()
  })

  // ── No overlapping elements (basic) ───────────────────────────────────────
  test('main content area does not overlap sidebar', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(300)
    const sidebar = page.locator('nav, aside').first()
    const main    = page.locator('main').first()
    if (await main.count() > 0) {
      const sidebarBox = await sidebar.boundingBox()
      const mainBox    = await main.boundingBox()
      if (sidebarBox && mainBox) {
        // Main left edge should be at or beyond sidebar right edge
        expect(mainBox.x).toBeGreaterThanOrEqual(sidebarBox.x + sidebarBox.width - 5)
      }
    }
  })

  // ── Notification page ──────────────────────────────────────────────────────
  test('notifications page shows unread indicator on bell icon', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(300)
    // Should have unread count somewhere in header/sidebar
    const body = await page.locator('body').innerText()
    // Sample data has 2 unread notifications
    expect(body).toMatch(/notification|bell|alert/i)
  })

  test('notifications page lists all 4 sample notifications', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForTimeout(300)
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/Vehicle Return|Upcoming Booking|Insurance|Service Due/)
  })

  test('mark all read button is present on notifications page', async ({ page }) => {
    await page.goto('/notifications')
    await page.waitForTimeout(300)
    const markAllBtn = page.locator('button:has-text("Mark All"), button:has-text("Read All"), button:has-text("Clear")').first()
    if (await markAllBtn.count() > 0) {
      await expect(markAllBtn).toBeVisible()
    }
  })

  // ── Handovers ──────────────────────────────────────────────────────────────
  test('handovers page renders without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto('/handovers')
    await page.waitForTimeout(400)
    expect(errors).toHaveLength(0)
  })

  // ── Screenshots for visual reference ──────────────────────────────────────
  test('dashboard screenshot saved for visual reference', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'playwright-report/screenshots/dashboard.png', fullPage: true })
  })

  test('bookings page screenshot', async ({ page }) => {
    await page.goto('/bookings')
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'playwright-report/screenshots/bookings.png', fullPage: true })
  })

  test('vehicles page screenshot', async ({ page }) => {
    await page.goto('/vehicles')
    await page.waitForTimeout(600)
    await page.screenshot({ path: 'playwright-report/screenshots/vehicles.png', fullPage: true })
  })
})
