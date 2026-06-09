import { Page } from '@playwright/test'

const ADMIN_AUTH = {
  state: {
    currentUser: {
      id: 'u_admin', username: 'admin', password: 'admin123',
      name: 'EMRAC Admin', role: 'admin',
    },
    permissions: {},
  },
  version: 0,
}

/** Inject admin auth via localStorage and reload — skips login UI */
export async function loginAsAdmin(page: Page) {
  await page.goto('/')
  await page.evaluate((auth) => {
    localStorage.setItem('emrac-auth-v1', JSON.stringify(auth))
  }, ADMIN_AUTH)
  await page.reload()
  await page.waitForURL('/')
}

/** Wipe all app state then inject fresh admin auth */
export async function freshSession(page: Page) {
  await page.goto('/')
  await page.evaluate((auth) => {
    localStorage.clear()
    localStorage.setItem('emrac-auth-v1', JSON.stringify(auth))
  }, ADMIN_AUTH)
  await page.reload()
  await page.waitForURL('/')
}

/** Log in through the actual login UI (used in auth tests) */
export async function loginViaUI(page: Page, username: string, password: string) {
  await page.goto('/')
  await page.evaluate(() => localStorage.removeItem('emrac-auth-v1'))
  await page.reload()
  await page.waitForSelector('input[autocomplete="username"]')
  await page.fill('input[autocomplete="username"]', username)
  await page.fill('input[autocomplete="current-password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(600)          // login has 400 ms delay
}
