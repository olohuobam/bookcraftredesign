import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
 test('loads successfully', async ({ page }) => {
 const response = await page.goto('/')
 expect(response?.status()).toBeLessThan(400)
 })

 test('has correct page title', async ({ page }) => {
 await page.goto('/')
 const title = await page.title()
 expect(title.toLowerCase()).toMatch(/bookcraft|book/i)
 })

 test('main content is visible', async ({ page }) => {
 await page.goto('/')
 const body = page.locator('body')
 await expect(body).toBeVisible()
 })

 test('page does not have console errors', async ({ page }) => {
 const errors: string[] = []
 page.on('console', msg => {
 if (msg.type() === 'error') {
 errors.push(msg.text())
 }
 })
 await page.goto('/')
 await page.waitForLoadState('networkidle')
    // Allow some errors (e.g. analytics, third-party), but fail on critical ones
 const criticalErrors = errors.filter(
 e =>
 !e.includes('favicon') &&
 !e.includes('analytics') &&
 !e.includes('gtag') &&
 !e.includes('intercom') &&
 !e.includes('Failed to load resource: the server responded with a status of 404')
 )
 expect(criticalErrors).toHaveLength(0)
 })
})

test.describe('Navigation', () => {
 test('FAQ page is reachable', async ({ page }) => {
 const response = await page.goto('/faq')
 expect(response?.status()).toBeLessThan(400)
 })

 test('Impressum page is reachable', async ({ page }) => {
 const response = await page.goto('/impressum')
 expect(response?.status()).toBeLessThan(400)
 })

 test('Datenschutz page is reachable', async ({ page }) => {
 const response = await page.goto('/datenschutz')
 expect(response?.status()).toBeLessThan(400)
 })
})
